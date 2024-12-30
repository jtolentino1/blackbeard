import mongoose, { Schema, Document } from 'mongoose';

interface IPaymentStats extends Document {
  totalAttempts: number;
  costPerAttempt: number;
  tokenCostPerAttempt: number;
  contractAddress: string;
}

const paymentStatsSchema = new Schema({
  totalAttempts: {
    type: Number,
    default: 0
  },
  costPerAttempt: {
    type: Number,
    default: 0
  },
  tokenCostPerAttempt: {
    type: Number,
    default: 0
  },
  contractAddress: {
    type: String,
    default: null
  }
});

export const PaymentStats = mongoose.model<IPaymentStats>('PaymentStats', paymentStatsSchema);