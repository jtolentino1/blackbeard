import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { handleMessage } from './messageHandler';
import { connection } from './solanaConnection';
import { PublicKey, LAMPORTS_PER_SOL, VersionedTransactionResponse, Connection } from '@solana/web3.js';
import { config } from '../config/config';
import { MessageModel } from '../models';
import { PaymentStats } from '../models/paymentStats';

async function verifyTokenPayment(
  connection: Connection,
  sender: string,
  transactionSignature: string,
  targetAddress: string,
  tokenMintAddress: string,
  minAmountRequired: number 
): Promise<boolean> {
  // 1. Prevent double-spend
  const existingMessage = await MessageModel.findOne({ transactionSignature });
  if (existingMessage) {
    console.warn('Duplicate transactionSignature detected:', transactionSignature);
    return false; 
  }

  // 2. Fetch transaction
  const tx: VersionedTransactionResponse | null = await connection.getTransaction(
    transactionSignature,
    { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
  );
  if (!tx) {
    console.warn('No transaction found for signature:', transactionSignature);
    return false;
  }

  const { meta, transaction } = tx;
  if (!meta || meta.err) {
    console.warn('Transaction meta missing or has error:', meta?.err);
    return false;
  }

  // 3. Check token transfer amounts
  const mintPubkey = new PublicKey(tokenMintAddress);
  const mintStr = mintPubkey.toBase58();

  const preTokenBalances = meta.preTokenBalances || [];
  const postTokenBalances = meta.postTokenBalances || [];

  function getBalanceForOwner(balances: typeof preTokenBalances, owner: string) {
    const record = balances.find(
      (b) => b.mint === mintStr && b.owner === owner
    );
    // Get both decimals and raw amount to handle precision correctly
    const amount = record?.uiTokenAmount?.uiAmount || 0;
    return Number(amount.toFixed(9)); // Fix to 9 decimal places to avoid floating point issues
  }

  const senderPre = getBalanceForOwner(preTokenBalances, sender);
  const senderPost = getBalanceForOwner(postTokenBalances, sender);
  const treasuryPre = getBalanceForOwner(preTokenBalances, targetAddress);
  const treasuryPost = getBalanceForOwner(postTokenBalances, targetAddress);

  // Calculate changes with fixed precision
  const senderChange = Number((senderPost - senderPre).toFixed(9));
  const treasuryChange = Number((treasuryPost - treasuryPre).toFixed(9));

  // Use a small epsilon for floating point comparison
  const epsilon = 1e-9;
  
  if (treasuryChange < minAmountRequired - epsilon) {
    console.warn('Token payment not enough. Required:', minAmountRequired, 'got:', treasuryChange);
    return false;
  }
  
  if (senderChange >= -epsilon) {
    console.warn('Sender did not lose tokens as expected. Suspicious transaction.');
    return false;
  }

  return true;
}

async function verifyFullPayment(
  connection: Connection,
  sender: string,
  transactionSignature: string,
  targetAddress: string
): Promise<boolean> {
  const existingMessage = await MessageModel.findOne({ transactionSignature });
  if (existingMessage) {
    console.warn('Duplicate transactionSignature detected:', transactionSignature);
    return false;
  }

  const tx: VersionedTransactionResponse | null = await connection.getTransaction(
    transactionSignature,
    {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    }
  );

  if (!tx) {
    console.warn('No transaction found for signature:', transactionSignature);
    return false;
  }

  const { meta, transaction } = tx;
  if (!meta) {
    console.warn('No meta found. Transaction might not be fully processed yet.');
    return false;
  }
  if (meta.err) {
    console.warn('Transaction has a non-null err field:', meta.err);
    return false; // Transaction failed
  }

  const senderPubkey = new PublicKey(sender);
  const targetPubkey = new PublicKey(targetAddress);

  const message = transaction.message;
  const accountKeys = meta.loadedAddresses
    ? message.getAccountKeys({ accountKeysFromLookups: meta.loadedAddresses })
    : message.getAccountKeys();

  const finalAccountKeys: PublicKey[] = [];
  for (let i = 0; i < accountKeys.length; i++) {
    const key = accountKeys.get(i);
    if (key) {
      finalAccountKeys.push(key);
    }
  }

  let senderPreBalance: number | undefined;
  let senderPostBalance: number | undefined;
  let targetPreBalance: number | undefined;
  let targetPostBalance: number | undefined;

  for (let i = 0; i < finalAccountKeys.length; i++) {
    const key = finalAccountKeys[i];
    if (key.equals(senderPubkey)) {
      senderPreBalance = meta.preBalances[i];
      senderPostBalance = meta.postBalances[i];
    }
    if (key.equals(targetPubkey)) {
      targetPreBalance = meta.preBalances[i];
      targetPostBalance = meta.postBalances[i];
    }
  }

  if (
    senderPreBalance === undefined ||
    senderPostBalance === undefined ||
    targetPreBalance === undefined ||
    targetPostBalance === undefined
  ) {
    console.warn('Could not find sender or target accounts in the final account keys.');
    return false;
  }

  const targetChange = targetPostBalance - targetPreBalance;

  const stats = await PaymentStats.findOne();
  if (!stats) {
    console.warn('Could not find payment stats');
    return false;
  }

  const requiredAmount = stats.costPerAttempt;
  const solSent = targetChange / LAMPORTS_PER_SOL;

  // Calculate acceptable range (within 5%)
  const minAcceptableAmount = requiredAmount * 0.95;

  if (solSent < minAcceptableAmount || solSent < 0.01) {
    console.warn('Payment verification (SOL) failed: not enough SOL sent. Required:', requiredAmount, 'got:', solSent);
    return false;
  }

  return true;
}

export function initializeSocketServer(httpServer: HttpServer) {  
  const allowedOrigins = config.nodeEnv === 'production' 
    ? [config.frontendUrl] 
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

  const io = new SocketServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["*"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    path: '/socket.io/'
  });

  io.on('connect', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.onAny((eventName, ...args) => {
      console.log(`Received event "${eventName}":`, args);
    });

    socket.on('send_message', async (message, callback) => {
      console.log('Received message from client:', JSON.stringify(message, null, 2));
      const { sender, transactionSignature, usedSol } = message; 

      try {
        let verified = false;
        if (usedSol) {
          // existing SOL verification
          verified = await verifyFullPayment(connection, sender, transactionSignature, config.treasuryAddress);
        } else {

          const paymentStats = await PaymentStats.findOne();
          if (!paymentStats) {
            throw new Error('Payment stats not found');
          }

          verified = await verifyTokenPayment(
            connection,
            sender,
            transactionSignature,
            config.softBurnAddress,
            paymentStats.contractAddress,
            paymentStats.tokenCostPerAttempt
          );
        }

        if (!verified) {
          console.error('Payment verification failed');
          return callback({ success: false });
        }

        // if verified, handle the message
        await handleMessage(io, message);
        callback({ success: true });
      } catch (error) {
        console.error('Error in message handling or verification:', error);
        callback({ success: false });
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}
