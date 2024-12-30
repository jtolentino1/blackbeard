import * as dotenv from 'dotenv';

// Load the environment variables from the root directory
dotenv.config({ path: '../.env' });

export const config = {
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  solanaNetwork: process.env.SOLANA_NETWORK || 'devnet',
  solanaRpcMainnet: process.env.SOLANA_RPC_MAINNET || '',
  frontendUrl: process.env.FRONTEND_URL || '',
  adminApiKey: process.env.ADMIN_API_KEY, 
  treasuryAddress: process.env.TREASURY_ADDRESS || '',
  softBurnAddress: process.env.SOFT_BURN_ADDRESS || '',
} as const;