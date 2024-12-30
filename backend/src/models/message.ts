import mongoose, { Schema } from 'mongoose';

const messageSchema = new Schema({
  sender: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  challengeId: {
    type: Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
  },
  hash: {
    type: String,
    required: false,
  },
  replyTo: {
    type: String,
    required: false, // Optional field for AI responses
  },
  transactionSignature: {
    type: String,
    required: false, // Make this optional
    unique: true,    // Ensure uniqueness only when present
    sparse: true,    // Allow multiple documents without this field
  },
});

messageSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const MessageModel = mongoose.model('Message', messageSchema);