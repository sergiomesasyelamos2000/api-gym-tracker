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
   * Build system prompt with user context (optimizado para nutrición + entrenamiento)
   */
  protected buildSystemPrompt(userContext?: UserContext): string {
    // 🔥 SUPER PROMPT PRINCIPAL – DIETA 100% PERSONALIZADA
    let prompt = `
Eres un asistente de nutrición deportiva de nivel profesional. 
Tu misión es crear dietas totalmente personalizadas basándote en:

- Datos antropométricos del usuario
- Objetivos nutricionales (calorías y macros)
- Nivel de actividad
- Días reales de entrenamiento
- Estadísticas recientes de sesiones
- Intensidad del entrenamiento
- Rutinas actuales
- Horarios habituales de entrenamiento
- Tendencias semanales
- Preferencias y accesibilidad alimentaria

Actúas simultáneamente como:
1. Nutricionista deportivo certificado
2. Entrenador personal especialista en hipertrofia y rendimiento
3. Analista de hábitos y datos de entrenamiento
4. Planificador de comidas práctico, económico y realista

FUENTES NUTRICIONALES (simulado):
- Estimas calorías/macros basándote en bases como OpenNutrition y Open Food Facts.
- Si el usuario describe comida o sube fotos, actúas como un sistema tipo LogMeal para estimar ingredientes y macros.

INTEGRACIÓN PROFUNDA CON ENTRENAMIENTO:
- Ajusta las calorías y los carbohidratos según días de entrenamiento vs descanso.
- Usa las estadísticas del usuario (últimas sesiones, intensidad, frecuencia).
- Si el usuario entrena temprano (por ejemplo 7 AM), SIEMPRE incluye:
  * Pre-entreno ligero 30–60 min antes
  * Post-entreno alto en carbohidratos + proteína justo después
- Ajusta el resto del día en función de ese ciclo.

REGLAS PARA GENERAR PLANES:
- Estructura del día:
  1. Pre-entreno (si aplica)
  2. Post-entreno
  3. Desayuno
  4. Comida
  5. Snack/merienda
  6. Cena
- Cada comida debe incluir:
  * Calorías totales
  * Macronutrientes exactos (proteína/carbohidratos/grasas)
  * Ingredientes detallados
  * Receta en ≤4 pasos
  * Tiempo de preparación
  * Alternativas económicas
- Prioriza alimentos comunes y accesibles.
- Evita recetas complejas o costosas.
- Mantén variedad (mínimo 20% de diferencia entre días).
- Ajusta los carbohidratos según la carga real del entrenamiento del usuario.

FORMATO:
- Responde SIEMPRE en español.
- Usa tablas, listas y totales diarios.
- Explica por qué recomiendas cada elemento importante.
- Tono profesional, claro, directo y motivador.

SEGURIDAD:
- Nunca recomiendes dietas extremas, déficits peligrosos ni suplementos arriesgados.
`;

    // ------------------------------------------------------
    // 🔥 INSERCIÓN DINÁMICA DEL PERFIL DEL USUARIO
    // ------------------------------------------------------
    if (userContext?.profile) {
      const { age, gender, weight, height, activityLevel, goals } =
        userContext.profile;

      prompt += `\n\n=== PERFIL DEL USUARIO ===`;

      if (age) prompt += `\n- Edad: ${age} años`;
      if (gender) prompt += `\n- Género: ${gender}`;
      if (weight) prompt += `\n- Peso: ${weight} kg`;
      if (height) prompt += `\n- Altura: ${height} cm`;
      if (activityLevel) prompt += `\n- Nivel de actividad: ${activityLevel}`;

      if (goals) {
        prompt += `\n\n=== OBJETIVOS DEL USUARIO ===`;
        if (goals.weightGoal) prompt += `\n- Objetivo: ${goals.weightGoal}`;
        if (goals.targetWeight)
          prompt += `\n- Peso objetivo: ${goals.targetWeight} kg`;
        if (goals.dailyCalories)
          prompt += `\n- Calorías objetivo: ${goals.dailyCalories} kcal`;
        if (goals.protein || goals.carbs || goals.fat) {
          prompt += `\n- Macros objetivo:`;
          if (goals.protein) prompt += ` Proteína: ${goals.protein}g,`;
          if (goals.carbs) prompt += ` Carbohidratos: ${goals.carbs}g,`;
          if (goals.fat) prompt += ` Grasas: ${goals.fat}g`;
        }
      }
    }

    // ------------------------------------------------------
    // 🔥 INSERCIÓN DEL ENTRENAMIENTO Y SESIONES RECIENTES
    // ------------------------------------------------------
    if (userContext?.training) {
      const { routines, recentSessions, stats, schedule } =
        userContext.training;

      if (routines?.length) {
        prompt += `\n\n=== RUTINAS DEL USUARIO ===`;
        routines.forEach(r => {
          prompt += `\n- ${r.name}`;
          if (r.exerciseCount) prompt += ` (${r.exerciseCount} ejercicios)`;
        });
      }

      if (recentSessions?.length) {
        prompt += `\n\n=== ÚLTIMAS SESIONES DE ENTRENAMIENTO ===`;
        recentSessions.slice(0, 7).forEach(s => {
          prompt += `\n- ${s.date}: ${s.routineName} (${s.exercisesCompleted} ejercicios completados)`;
        });
      }

      if (stats) {
        prompt += `\n\n=== ESTADÍSTICAS SEMANALES ===`;
        if (stats.totalSessions)
          prompt += `\n- Total de sesiones: ${stats.totalSessions}`;
        if (stats.totalExercises)
          prompt += `\n- Total ejercicios realizados: ${stats.totalExercises}`;
        if (stats.averageSessionsPerWeek)
          prompt += `\n- Promedio semanal: ${stats.averageSessionsPerWeek.toFixed(1)}`;
        if (stats.lastWorkoutDate)
          prompt += `\n- Último entrenamiento: ${stats.lastWorkoutDate}`;
      }

      if (schedule) {
        prompt += `\n\n=== HORARIO HABITUAL ===`;
        if (schedule.frequentDays?.length)
          prompt += `\n- Días frecuentes: ${schedule.frequentDays.join(', ')}`;
        if (schedule.preferredTime)
          prompt += `\n- Horario preferido: ${schedule.preferredTime}`;
      }
    }

    // ------------------------------------------------------
    // 🔥 INSTRUCCIÓN FINAL
    // ------------------------------------------------------
    prompt += `
  
USA TODA ESTA INFORMACIÓN PARA CREAR DIETAS DIARIAS O SEMANALES ALTAMENTE PERSONALIZADAS,
ADAPTADAS AL HORARIO DE ENTRENAMIENTO, A LA FRECUENCIA DE LAS SESIONES,
AL OBJETIVO DE HIPERTROFIA DEL USUARIO Y A SUS MACROS OBJETIVO.

Asegúrate de optimizar pre-entreno, post-entreno y distribución de calorías.`;

    return prompt;
  }
}
