import OpenAI from 'openai';
import { config } from '../config/config';
import { MessageModel } from '../models';
import { IChallenge } from '../models/challenge';

const MAX_CONTEXT_MESSAGES = 10;

export class AIAgent {
  private openai: OpenAI;
  private challenge: IChallenge;

  constructor(challenge: IChallenge) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.challenge = challenge;
  }

  private async getConversationContext(currentUserId: string): Promise<Array<OpenAI.Chat.ChatCompletionMessageParam>> {
    try {
      const recentMessages = await MessageModel.find({
        challengeId: this.challenge._id,
        $or: [
          { sender: currentUserId },
          { sender: this.challenge.agent.name, replyTo: currentUserId }
        ]
      })
        .sort({ timestamp: -1 })
        .limit(MAX_CONTEXT_MESSAGES)
        .lean();

      return recentMessages.reverse().map(msg => ({
        role: msg.sender === this.challenge.agent.name ? 'assistant' : 'user',
        content: msg.content
      }));
    } catch (error) {
      console.error('Error fetching conversation context:', error);
      return [];
    }
  }

  async generateResponse(message: string, userId: string): Promise<string> {
    try {
      const conversationContext = await this.getConversationContext(userId);
      const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [
        {
          role: "system",
          content: this.challenge.agent.systemPrompt
        },
        ...conversationContext,
        {
          role: "user",
          content: message
        }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.challenge.agent.model,
        messages,
        temperature: this.challenge.agent.temperature,
        max_tokens: this.challenge.agent.maxTokens,
        frequency_penalty: this.challenge.agent.frequencyPenalty,
        presence_penalty: this.challenge.agent.presencePenalty,
        stream: false,
      });

      const response = completion.choices[0].message;
      console.log('AI response:', response.content);
      return response.content || 'No response generated';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }
}
