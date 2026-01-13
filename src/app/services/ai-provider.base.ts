import { Injectable, Logger } from '@nestjs/common';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  provider: 'gemini' | 'groq';
  model: string;
}

export interface UserContext {
  userId?: string;
  profile?: {
    age?: number;
    gender?: string;
    weight?: number;
    height?: number;
    activityLevel?: string;
    goals?: {
      weightGoal?: string;
      targetWeight?: number;
      dailyCalories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    };
  };
  training?: {
    routines?: Array<{
      id: string;
      name: string;
      description?: string;
      exerciseCount?: number;
    }>;
    recentSessions?: Array<{
      date: string;
      routineName: string;
      duration?: number;
      exercisesCompleted?: number;
    }>;
    stats?: {
      totalSessions?: number;
      totalExercises?: number;
      averageSessionsPerWeek?: number;
      lastWorkoutDate?: string;
    };
    schedule?: {
      frequentDays?: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
      preferredTime?: string; // e.g., 'Morning', 'Evening', '18:00'
    };
  };
}

/**
 * Abstract base class for AI providers
 */
@Injectable()
export abstract class AIProvider {
  protected readonly logger = new Logger(this.constructor.name);

  abstract chat(
    messages: ChatMessage[],
    userContext?: UserContext,
  ): Promise<ChatResponse>;

  abstract isAvailable(): Promise<boolean>;

  /**
   * Build system prompt with user context (optimizado y COMPACTO)
   */
  protected buildSystemPrompt(userContext?: UserContext): string {
    let prompt = `Eres un asistente de nutrición deportiva profesional. Creas dietas personalizadas basadas en:
- Datos del usuario (edad, peso, altura, actividad)
- Objetivos (calorías, macros, peso objetivo)
- Entrenamiento (rutinas, sesiones, horarios)

REGLAS:
- Ajusta calorías/carbos según días de entrenamiento vs descanso
- Incluye pre/post-entreno si entrena temprano
- Cada comida: calorías, macros (P/C/G), ingredientes, receta simple
- Alimentos comunes y económicos
- Responde en español, usa tablas
- Nunca dietas extremas`;

    // Perfil básico
    if (userContext?.profile) {
      const { age, weight, height, goals } = userContext.profile;
      prompt += `\n\nPERFIL:`;
      if (age) prompt += ` ${age}años,`;
      if (weight) prompt += ` ${weight}kg,`;
      if (height) prompt += ` ${height}cm`;

      if (goals?.dailyCalories || goals?.protein) {
        prompt += `\nOBJETIVOS:`;
        if (goals.dailyCalories) prompt += ` ${goals.dailyCalories}kcal,`;
        if (goals.protein) prompt += ` P:${goals.protein}g,`;
        if (goals.carbs) prompt += ` C:${goals.carbs}g,`;
        if (goals.fat) prompt += ` G:${goals.fat}g`;
      }
    }

    // Entrenamiento resumido
    if (userContext?.training) {
      const { stats, schedule } = userContext.training;

      if (stats?.averageSessionsPerWeek) {
        prompt += `\nENTRENAMIENTO: ${stats.averageSessionsPerWeek.toFixed(1)} sesiones/semana`;
      }

      if (schedule?.preferredTime) {
        prompt += `, horario: ${schedule.preferredTime}`;
      }
    }

    return prompt;
  }
}
