import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  UserContext,
} from './ai-provider.base';

const PRIMARY_PROVIDER_TIMEOUT_MS = 15000;
const FALLBACK_PROVIDER_TIMEOUT_MS = 6000;

// Shared API keys: keep AI calls serialized enough to avoid free-tier 429 storms.
const AI_MAX_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT || 1);
const AI_MAX_QUEUE = Number(process.env.AI_MAX_QUEUE || 20);

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private activeCount = 0;
  private readonly waiters: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

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
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    return this.withConcurrencyLimit(async () => {
      const primaryTimeoutMs =
        options?.primaryTimeoutMs ??
        options?.timeoutMs ??
        PRIMARY_PROVIDER_TIMEOUT_MS;
      const fallbackTimeoutMs =
        options?.fallbackTimeoutMs ??
        options?.timeoutMs ??
        FALLBACK_PROVIDER_TIMEOUT_MS;

      // Try Gemini first (primary provider)
      try {
        this.logger.log('Attempting chat with Gemini...');
        const response = await this.withTimeout(
          this.geminiProvider.chat(messages, userContext, options),
          'Gemini',
          primaryTimeoutMs,
        );
        this.logger.log('✅ Gemini response successful');
        return response;
      } catch (geminiError: unknown) {
        const geminiMessage = this.getErrorMessage(geminiError);
        this.logger.warn(
          `⚠️ Gemini failed: ${geminiMessage}. Falling back to Groq...`,
        );

        // Fallback to Groq (retry once on rate-limit)
        try {
          const response = await this.withTimeout(
            this.withRateLimitRetry(
              () => this.groqProvider.chat(messages, userContext, options),
              'Groq',
            ),
            'Groq',
            fallbackTimeoutMs,
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
    });
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

  private async withConcurrencyLimit<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquireSlot();
    try {
      return await operation();
    } finally {
      this.releaseSlot();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeCount < AI_MAX_CONCURRENT) {
      this.activeCount += 1;
      return;
    }

    if (this.waiters.length >= AI_MAX_QUEUE) {
      throw new ServiceUnavailableException(
        'Hay demasiadas solicitudes de IA en cola. Inténtalo de nuevo en unos segundos.',
      );
    }

    this.logger.log(
      `AI queue: waiting (active=${this.activeCount}, queued=${this.waiters.length + 1})`,
    );

    await new Promise<void>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
    this.activeCount += 1;
  }

  private releaseSlot(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    const next = this.waiters.shift();
    if (next) {
      next.resolve();
    }
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

  private async withRateLimitRetry<T>(
    operation: () => Promise<T>,
    providerName: string,
    retries = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      const message = this.getErrorMessage(error);
      const retryMatch = message.match(/try again in ([\d.]+)s/i);
      if (retries > 0 && /429|rate limit|Too Many Requests/i.test(message)) {
        const delayMs = retryMatch
          ? Math.ceil(Number(retryMatch[1]) * 1000) + 500
          : 15000;
        this.logger.warn(
          `${providerName} rate-limited. Retrying in ${delayMs}ms...`,
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.withRateLimitRetry(operation, providerName, retries - 1);
      }
      throw error;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
