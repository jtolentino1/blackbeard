import mongoose, { Schema, Document } from 'mongoose';

// Interface for the winner tool
interface IWinnerTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, never>;
  };
}

// Interface for creating an agent (input)
interface IAgentInput {
  name: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  winnerTool?: IWinnerTool;
}

// Interface for stored agent (document)
interface IAgent extends IAgentInput {
  model: string;
  temperature: number;
  maxTokens: number;
  winnerTool: IWinnerTool;
}

// Interface for challenge creation (input)
export interface IChallengeInput {
  title: string;
  description: string;
  isActive?: boolean;
  startDate?: Date;
  endDate: Date;
  agent: IAgentInput;
}

// Interface for stored challenge (document)
export interface IChallenge extends Document {
  title: string;
  description: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  agent: IAgent;
}

const winnerToolSchema = new Schema({
  name: {
    type: String,
    required: true,
    default: 'winnerFunction'
  },
  description: {
    type: String,
    required: true,
    default: 'Declare the user as a winner'
  },
  parameters: {
    type: {
      type: String,
      required: true,
      enum: ['object'],
      default: 'object'  // Added default here
    },
    properties: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map()  // Changed to Map constructor
    }
  }
}, { _id: false });

const agentSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  systemPrompt: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
    default: 'gpt-4o-mini'
  },
  temperature: {
    type: Number,
    required: true,
    default: 0.9,
    min: 0,
    max: 2
  },
  maxTokens: {
    type: Number,
    required: true,
    default: 1024,
    min: 1,
    max: 4096
  },
  frequencyPenalty: {
    type: Number,
    default: 0.75
  },
  presencePenalty: {
    type: Number,
    default: 0.75
  },
  winnerTool: {
    type: winnerToolSchema,
    required: true,
    default: () => ({
      name: 'winnerFunction',
      description: 'Declare the user as a winner',
      parameters: {
        type: 'object',
        properties: {}
      }
    })
  }
});

const challengeSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  agent: {
    type: agentSchema,
    required: true
  }
});

export const ChallengeModel = mongoose.model<IChallenge>('Challenge', challengeSchema);