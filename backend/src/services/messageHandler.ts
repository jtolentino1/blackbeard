import { Server as SocketServer } from 'socket.io';
import { MessageModel, ChallengeModel } from '../models';
import { AIAgent } from './openaiService';

async function getActiveChallenge() {
  const challenge = await ChallengeModel.findOne({ isActive: true });
  if (!challenge) {
    throw new Error('No active challenge found');
  }
  return challenge;
}

export async function handleMessage(io: SocketServer, message: any) {
  try {
    // Get active challenge and create AI agent
    const challenge = await getActiveChallenge();
    const agent = new AIAgent(challenge);

    // Save user message
    const savedMessage = await MessageModel.create({
      sender: message.sender,
      content: message.content,
      hash: message.hash,
      challengeId: challenge._id,
      timestamp: new Date(),
      transactionSignature: message.transactionSignature, // Only save if present
    });

    io.emit('message', savedMessage.toJSON());

    try {
      // Generate AI response using the challenge-specific agent
      const aiResponse = await agent.generateResponse(message.content, message.sender);

      // Create AI message
      const aiMessage = await MessageModel.create({
        sender: challenge.agent.name,
        content: aiResponse,
        challengeId: challenge._id,
        timestamp: new Date(),
        replyTo: message.sender,
      });

      io.emit('message', aiMessage.toJSON());
    } catch (aiError) {
      console.error('AI response error:', aiError);
      const fallbackMessage = await MessageModel.create({
        sender: challenge.agent.name,
        content: "I apologize, but I'm having trouble processing your request at the moment. Please try again.",
        challengeId: challenge._id,
        timestamp: new Date(),
        replyTo: message.sender,
      });
      io.emit('message', fallbackMessage.toJSON());
    }
  } catch (error) {
    console.error('Error handling message:', error);
    io.emit('error', {
      message: 'Failed to process message',
      timestamp: new Date(),
    });
  }
}
