import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ENV } from '../../environments/environment';
import {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  UserContext,
} from './ai-provider.base';

@Injectable()
export class GeminiProvider extends AIProvider {
  private client: GoogleGenerativeAI;

  constructor() {
    super();
    this.client = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
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

      // Keep gemini-2.5-flash: gemini-2.0-flash free-tier quota is often 0.
      const modelName = 'gemini-2.5-flash';

      const generationConfig: Record<string, unknown> = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
      };

      if (options?.responseFormat === 'json') {
        generationConfig.responseMimeType = 'application/json';
        // Avoid spending output budget on model "thinking".
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const model = this.client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: generationConfig as any,
      });

      let history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      if (history.length > 0 && history[0].role === 'model') {
        history = history.slice(1);
      }

      const chat = model.startChat({
        history: history,
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const responseText = result.response.text();

      return {
        content: responseText,
        provider: 'gemini',
        model: modelName,
      };
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      return !!ENV.GEMINI_API_KEY;
    } catch {
      return false;
    }
  }
}
