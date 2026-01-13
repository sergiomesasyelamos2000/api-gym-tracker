import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ENV } from '../../environments/environment';
import {
  AIProvider,
  ChatMessage,
  ChatResponse,
  UserContext,
} from './ai-provider.base';

@Injectable()
export class GroqProvider extends AIProvider {
  private client: Groq;

  constructor() {
    super();
    this.client = new Groq({
      apiKey: ENV.GROQ_API_KEY,
    });
  }

  async chat(
    messages: ChatMessage[],
    userContext?: UserContext,
  ): Promise<ChatResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(userContext);

      // Convert messages to Groq format
      const groqMessages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      const completion = await this.client.chat.completions.create({
        messages: groqMessages,
        model: 'llama-3.1-8b-instant', // Smaller, faster model with lower token limits
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        stream: false,
      });

      const responseText =
        completion.choices[0]?.message?.content ??
        'Lo siento, no pude generar una respuesta.';

      return {
        content: responseText,
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
      };
    } catch (error) {
      this.logger.error('Groq API error:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check
      return !!ENV.GROQ_API_KEY;
    } catch {
      return false;
    }
  }
}
