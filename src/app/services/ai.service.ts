import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { ChatMessage, ChatResponse, UserContext } from './ai-provider.base';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly groqProvider: GroqProvider,
  ) {}

  /**
   * Chat with multi-provider fallback
   * Tries Gemini first, falls back to Groq if it fails
   */
  async chat(
    messages: ChatMessage[],
    userContext?: UserContext,
  ): Promise<ChatResponse> {
    // Try Gemini first (primary provider)
    try {
      this.logger.log('Attempting chat with Gemini...');
      const response = await this.geminiProvider.chat(messages, userContext);
      this.logger.log('✅ Gemini response successful');
      return response;
    } catch (geminiError) {
      this.logger.warn(
        `⚠️ Gemini failed: ${geminiError.message}. Falling back to Groq...`,
      );

      // Fallback to Groq
      try {
        const response = await this.groqProvider.chat(messages, userContext);
        this.logger.log('✅ Groq response successful (fallback)');
        return response;
      } catch (groqError) {
        this.logger.error(
          `❌ Both providers failed. Gemini: ${geminiError.message}, Groq: ${groqError.message}`,
        );
        throw new Error(
          'No se pudo procesar tu solicitud. Por favor, inténtalo más tarde.',
        );
      }
    }
  }

  /**
   * Get health status of all providers
   */
  async getProvidersHealth(): Promise<{
    gemini: boolean;
    groq: boolean;
  }> {
    const [gemini, groq] = await Promise.all([
      this.geminiProvider.isAvailable(),
      this.groqProvider.isAvailable(),
    ]);

    return { gemini, groq };
  }
}
