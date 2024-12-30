import { Document } from 'mongoose';

export interface IWinnerTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, never>;
  };
}

export interface IAgent {
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  winnerTool: IWinnerTool;
}

export interface IChallenge {
  title: string;
  description: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  agent: IAgent;
}

export interface IChallengeDocument extends IChallenge, Document {}

export interface ChallengeResponse {
  content: string;
  isWinner: boolean;
}