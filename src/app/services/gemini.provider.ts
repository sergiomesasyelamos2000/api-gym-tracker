import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ENV } from '../../environments/environment';
import {
  AIProvider,
  ChatMessage,
  ChatResponse,
  UserContext,
} from './ai-provider.base';

@Injectable()
export class GeminiProvider extends AIProvider {
  private client: GoogleGenAI;

  constructor() {
    super();
    this.client = new GoogleGenAI({
      apiKey: ENV.AIMLAPI_KEY,
    });
  }

  async chat(
    messages: ChatMessage[],
    userContext?: UserContext,
  ): Promise<ChatResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(userContext);

      // Convert messages to Gemini format
      const contents = [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
      ];

      // Call Gemini API - using gemini-2.0-flash-exp (available in v1beta)
      const result = await this.client.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: contents as any,
      });

      const responseText =
        result.text ?? 'Lo siento, no pude generar una respuesta.';

      return {
        content: responseText,
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
      };
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check
      return !!ENV.AIMLAPI_KEY;
    } catch {
      return false;
    }
  }
}
