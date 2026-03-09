import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { ChatMessage, ChatResponse, UserContext } from './ai-provider.base';

const PRIMARY_PROVIDER_TIMEOUT_MS = 8000;
const FALLBACK_PROVIDER_TIMEOUT_MS = 6000;

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
      const response = await this.withTimeout(
        this.geminiProvider.chat(messages, userContext),
        'Gemini',
        PRIMARY_PROVIDER_TIMEOUT_MS,
      );
      this.logger.log('✅ Gemini response successful');
      return response;
    } catch (geminiError: unknown) {
      const geminiMessage = this.getErrorMessage(geminiError);
      this.logger.warn(
        `⚠️ Gemini failed: ${geminiMessage}. Falling back to Groq...`,
      );

      // Fallback to Groq
      try {
        const response = await this.withTimeout(
          this.groqProvider.chat(messages, userContext),
          'Groq',
          FALLBACK_PROVIDER_TIMEOUT_MS,
        );
        this.logger.log('✅ Groq response successful (fallback)');
        return response;
      } catch (groqError: unknown) {
        const groqMessage = this.getErrorMessage(groqError);
        this.logger.error(
          `❌ Both providers failed. Gemini: ${geminiMessage}, Groq: ${groqMessage}`,
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

  private async withTimeout<T>(
    promise: Promise<T>,
    providerName: string,
    timeoutMs: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${providerName} timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(value => {
          clearTimeout(timeout);
          resolve(value);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
