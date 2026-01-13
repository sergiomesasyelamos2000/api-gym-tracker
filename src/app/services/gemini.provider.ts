import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ENV } from '../../environments/environment';
import {
  AIProvider,
  ChatMessage,
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
  ): Promise<ChatResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(userContext);

      // 1. Usar 'systemInstruction' nativo (disponible en versiones recientes del SDK)
      // Esto evita el hack de crear mensajes falsos y reduce errores de rol.
      const model = this.client.getGenerativeModel({
        model: 'gemini-2.5-flash', // Verified to work with free tier
        systemInstruction: systemPrompt,
      });

      // 2. Preparar el historial (excluyendo el mensaje actual que se enviará después)
      let history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // 3. CORRECCIÓN CRÍTICA: Asegurar que el historial empiece por 'user'
      // Si el primer mensaje es del modelo (ej. un saludo), lo eliminamos del historial
      // para evitar el error "First content should be with role 'user'".
      if (history.length > 0 && history[0].role === 'model') {
        history = history.slice(1);
      }

      // 4. Iniciar el chat con el historial limpio
      const chat = model.startChat({
        history: history,
      });

      // 5. Enviar el último mensaje (el input actual del usuario)
      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);

      const responseText = result.response.text();

      return {
        content: responseText,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
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
