import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ENV } from '../../environments/environment';
import {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  UserContext,
} from './ai-provider.base';

@Injectable()
export class GroqProvider extends AIProvider {
  private client: Groq;
  private readonly model: string;

  constructor() {
    super();
    this.client = new Groq({
      apiKey: ENV.GROQ_API_KEY,
    });
    // llama-3.1-8b-instant retired 2026-08-16 for free/dev; official replacement.
    this.model = ENV.GROQ_MODEL;
  }

  async chat(
    messages: ChatMessage[],
    userContext?: UserContext,
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(
        userContext,
        options?.responseFormat,
      );
      const maxTokens =
        options?.responseFormat === 'json'
          ? Math.min(options?.maxTokens ?? 2048, 8192)
          : options?.maxTokens ?? 2048;

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
        model: this.model,
        temperature: options?.temperature ?? 0.7,
        max_tokens: maxTokens,
        top_p: 1,
        stream: false,
        ...(options?.responseFormat === 'json'
          ? { response_format: { type: 'json_object' as const } }
          : {}),
      });

      const responseText =
        completion.choices[0]?.message?.content ??
        'Lo siento, no pude generar una respuesta.';

      return {
        content: responseText,
        provider: 'groq',
        model: this.model,
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
