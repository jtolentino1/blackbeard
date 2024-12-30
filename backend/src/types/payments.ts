export interface PaymentStats {
    address: string;
    solBalance: number;
    usdBalance: number;
    totalAttempts: number;
    costPerAttempt: number;
    tokenCostPerAttempt: number;
    contractAddress: string;
  }