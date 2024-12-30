import { Document, Types } from 'mongoose';

export interface IMessage {
  sender: string;
  content: string;
  timestamp: Date;
  challengeId: Types.ObjectId | string;
  transactionSignature?: string; // Optional field
}

export interface IMessageDocument extends IMessage, Document {}
