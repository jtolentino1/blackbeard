'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getEndDate } from '../actions/challenge';
import { incrementAttempt } from '../actions/payment';

interface PaymentStats {
  costPerAttempt: number;
  tokenCostPerAttempt: number;
  solBalance: number;
  usdBalance: number;
  totalAttempts: number;
  solPrice: number;
  endDate?: string; 
  isActive: boolean;
  contractAddress?: string;
}

interface PaymentContextType {
  stats: PaymentStats;
  updateAttempts: () => Promise<void>;
  refreshStats: () => Promise<void>;
  isValidAddress: boolean;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

const DEFAULT_SOL_PRICE = 220;

const isValidSolanaAddress = (address: string): boolean => {
  try {
    if (!address) return false;
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

export function PaymentProvider({ 
  children, 
  targetAddress 
}: { 
  children: React.ReactNode;
  targetAddress: string;
}) {
  const { connection } = useConnection();
  const [stats, setStats] = useState<PaymentStats>({
    costPerAttempt: 0,
    tokenCostPerAttempt: 0,
    solBalance: 0,
    usdBalance: 0,
    totalAttempts: 0,
    solPrice: DEFAULT_SOL_PRICE,
    endDate: undefined,
    isActive: true,
    contractAddress: undefined,
  });
  const [lastFetchedPrice, setLastFetchedPrice] = useState<number>(DEFAULT_SOL_PRICE);

  const fetchSolPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      if (data?.solana?.usd) {
        setLastFetchedPrice(data.solana.usd);
        return data.solana.usd;
      }
    } catch (error) {
      // Silently handle the error
      
    }
    return lastFetchedPrice; // Return last known price in error case
  };

  const fetchEndDate = async () => {
    const data = await getEndDate();
    return data.endDate;
  };

  const isValidAddress = isValidSolanaAddress(targetAddress);

  const updateAttempts = async () => {
    if (!isValidAddress) return;
    try {
      const response = await incrementAttempt();
      const data = await response.json();
      setStats(prev => ({ ...prev, totalAttempts: data.totalAttempts }));
    } catch {
      // Silently handle error
    }
  };

  const refreshStats = async () => {
    if (!isValidAddress) return;
    try {
      const solPrice = await fetchSolPrice();
      const publicKey = new PublicKey(targetAddress);
      const balance = await connection.getBalance(publicKey);
      const solBalance = parseFloat((balance / LAMPORTS_PER_SOL).toFixed(4));

      // Fetch attempts and cost per attempt
      const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST_URL}/api/payment/attempts`);
      const paymentStats = await statsResponse.json();

      const costResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST_URL}/api/payment/cost`);
      // Destructure the array response since it's a tuple
      const [costPerAttempt = 0, tokenCostPerAttempt = 0] = await costResponse.json();

      const isActiveResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST_URL}/api/challenge/isActive`);
      const isActiveData = await isActiveResponse.json();
      const isActive = isActiveData.isActive || false;

      const endDate = await fetchEndDate();

      const contractAdressResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST_URL}/api/payment/contractAddress`);
      const contractAddress = await contractAdressResponse.json(); 
      console.log('contractAddress', contractAddress);

      setStats(prev => ({
        ...prev,
        solBalance,
        usdBalance: parseFloat((solBalance * solPrice).toFixed(2)),
        totalAttempts: paymentStats.totalAttempts,
        solPrice,
        costPerAttempt,
        tokenCostPerAttempt,
        endDate,
        isActive,
        contractAddress,
      }));
    } catch {
      // Silently handle any errors and keep previous state
    }
  };

  useEffect(() => {
    if (isValidAddress) {
      refreshStats();
      const interval = setInterval(refreshStats, 50000);
      return () => clearInterval(interval);
    }
  }, [connection, targetAddress, isValidAddress]);

  return (
    <PaymentContext.Provider value={{ stats, updateAttempts, refreshStats, isValidAddress }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}
