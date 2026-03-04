import {
  CreateExerciseDto,
  EquipmentEntity,
  ExerciseEntity,
  ExerciseTypeEntity,
  MuscleEntity,
} from '@app/entity-data-models';
import { v2 as translate } from '@google-cloud/translate';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Brackets, Repository } from 'typeorm';

const sharp = require('sharp');

interface ExerciseDbItem {
  name: string;
  gifUrl?: string;
  gif_url?: string;
  gif?: string;
  videoUrl?: string;
  targetMuscles?: string[];
  bodyParts?: string[];
  equipments?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  exerciseType?: string;
  keywords?: string[];
  exerciseTips?: string[];
  variations?: string[];
  overview?: string;
  relatedExerciseIds?: string[];
  imageUrl?: string;
  image?: string;
  images?: string[];
  exerciseName?: string;
  title?: string;
}

interface ExerciseSearchParams {
  name?: string;
  equipment?: string;
  muscle?: string;
}

const POPULAR_EXERCISE_PATTERNS: Array<{ pattern: string; score: number }> = [
  { pattern: 'bench press', score: 120 },
  { pattern: 'press banca', score: 120 },
  { pattern: 'squat', score: 118 },
  { pattern: 'sentadilla', score: 118 },
  { pattern: 'deadlift', score: 116 },
  { pattern: 'peso muerto', score: 116 },
  { pattern: 'lat pulldown', score: 112 },
  { pattern: 'jalon al pecho', score: 112 },
  { pattern: 'pull up', score: 110 },
  { pattern: 'pull-up', score: 110 },
  { pattern: 'dominadas', score: 110 },
  { pattern: 'row', score: 108 },
  { pattern: 'remo', score: 108 },
  { pattern: 'overhead press', score: 106 },
  { pattern: 'shoulder press', score: 106 },
  { pattern: 'military press', score: 104 },
  { pattern: 'press militar', score: 104 },
  { pattern: 'leg press', score: 102 },
  { pattern: 'prensa', score: 102 },
  { pattern: 'lunge', score: 100 },
  { pattern: 'zancada', score: 100 },
  { pattern: 'concentration curl', score: 100 },
  { pattern: 'triangle push-up', score: 99 },
  { pattern: 'diamond push-up', score: 99 },
  { pattern: 'hip thrust', score: 98 },
  { pattern: 'empuje de cadera', score: 98 },
  { pattern: 'rdl', score: 97 },
  { pattern: 'romanian deadlift', score: 97 },
  { pattern: 'leg curl', score: 95 },
  { pattern: 'curl femoral', score: 95 },
  { pattern: 'leg extension', score: 94 },
  { pattern: 'extension de cuadriceps', score: 94 },
  { pattern: 'kickback', score: 93 },
  { pattern: 'calf raise', score: 92 },
  { pattern: 'elevacion de talones', score: 92 },
  { pattern: 'bicep curl', score: 90 },
  { pattern: 'barbell curl', score: 90 },
  { pattern: 'curl biceps', score: 90 },
  { pattern: 'tricep pushdown', score: 89 },
  { pattern: 'triceps pushdown', score: 89 },
  { pattern: 'dips', score: 88 },
  { pattern: 'fondos', score: 88 },
  { pattern: 'pec deck', score: 86 },
  { pattern: 'cable crossover', score: 85 },
  { pattern: 'fly', score: 84 },
  { pattern: 'aperturas', score: 84 },
  { pattern: 'crunch', score: 83 },
  { pattern: 'abdominal', score: 83 },
  { pattern: 'plank', score: 82 },
  { pattern: 'plancha', score: 82 },
  { pattern: 'ab rollout', score: 81 },
];

@Injectable()
export class ExercisesService implements OnModuleInit {
  private readonly logger = new Logger(ExercisesService.name);
  private readonly translator: translate.Translate;
  private readonly strictTranslation =
    process.env.TRANSLATION_STRICT === 'true' ||
    process.env.TRANSLATION_STRICT === '1';

  // Diccionario de traducciones personalizadas
  private readonly customTranslations: { [key: string]: string } = {
    // Músculos
    back: 'Espalda',
    neck: 'Cuello',
    shoulders: 'Hombros',
    chest: 'Pecho',
    waist: 'Cintura',
    'upper back': 'Espalda alta',
    'lower back': 'Espalda baja',
    'upper arms': 'Brazos superiores',
    'lower arms': 'Brazos inferiores',
    'upper legs': 'Piernas superiores',
    'lower legs': 'Piernas inferiores',
    abs: 'Abdominales',
    glutes: 'Glúteos',
    hamstrings: 'Isquiotibiales',
    quadriceps: 'Cuádriceps',
    calves: 'Pantorrillas',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    forearms: 'Antebrazos',
    lats: 'Dorsales',
    traps: 'Trapecios',
    delts: 'Deltoides',
    pecs: 'Pectorales',

    // Equipamiento
    barbell: 'Barra',
    dumbbell: 'Mancuernas',
    bodyweight: 'Peso corporal',
    cable: 'Polea',
    machine: 'Máquina',
    kettlebell: 'Pesa rusa',
    band: 'Banda elástica',
    'resistance band': 'Banda de resistencia',
    'ez bar': 'Barra Z',
    'smith machine': 'Máquina Smith',
    bench: 'Banco',

    // Tipos de ejercicio
    strength: 'Fuerza',
    cardio: 'Cardio',
    stretching: 'Estiramiento',
    plyometrics: 'Pliométricos',
    powerlifting: 'Powerlifting',
    olympic: 'Olímpico',
    weightlifting: 'Halterofilia',
    yoga: 'Yoga',
    aerobic: 'Aeróbico',
  };

  constructor(
    @InjectRepository(ExerciseEntity)
    public exerciseRepository: Repository<ExerciseEntity>,
    @InjectRepository(EquipmentEntity)
    public equipmentRepository: Repository<EquipmentEntity>,
    @InjectRepository(MuscleEntity)
    public muscleRepository: Repository<MuscleEntity>,
    @InjectRepository(ExerciseTypeEntity)
    public exerciseTypeRepository: Repository<ExerciseTypeEntity>,
    private readonly httpService: HttpService,
  ) {
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const explicitProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (credentialsJson) {
      try {
        const parsedCredentials = JSON.parse(credentialsJson);
        if (typeof parsedCredentials.private_key === 'string') {
          parsedCredentials.private_key = parsedCredentials.private_key.replace(
            /\\n/g,
            '\n',
          );
        }

        this.translator = new translate.Translate({
          projectId: explicitProjectId || parsedCredentials.project_id,
          credentials: parsedCredentials,
        });
      } catch (error) {
        this.logger.error(
          'GOOGLE_CREDENTIALS_JSON inválido. Se usará GOOGLE_APPLICATION_CREDENTIALS si existe.',
        );
        this.translator = new translate.Translate({
          projectId: explicitProjectId,
          keyFilename,
        });
      }
    } else {
      this.translator = new translate.Translate({
        projectId: explicitProjectId,
        keyFilename,
      });
    }
  }

  async onModuleInit() {
    // 🔄 Sincronización automática condicional
    // Solo sincroniza si las tablas están vacías (primera vez o después de borrar volumen)
    this.logger.log('🔍 Verificando estado de las tablas...');

    const muscleCount = await this.muscleRepository.count();
    const equipmentCount = await this.equipmentRepository.count();
    const exerciseTypeCount = await this.exerciseTypeRepository.count();

    this.logger.log(
      `📊 Estado actual: Músculos=${muscleCount}, Equipamiento=${equipmentCount}, Tipos=${exerciseTypeCount}`,
    );

    // Sincronizar músculos si la tabla está vacía
    if (muscleCount === 0) {
      this.logger.log('⚠️ Tabla de músculos vacía, sincronizando...');
      await this.syncBodyParts();
    } else {
      this.logger.log(`✅ Músculos ya cargados (${muscleCount} registros)`);
    }

    // Sincronizar equipamiento si la tabla está vacía
    if (equipmentCount === 0) {
      this.logger.log('⚠️ Tabla de equipamiento vacía, sincronizando...');
      await this.syncEquipment();
    } else {
      this.logger.log(
        `✅ Equipamiento ya cargado (${equipmentCount} registros)`,
      );
    }

    // Sincronizar tipos de ejercicio si la tabla está vacía
    if (exerciseTypeCount === 0) {
      this.logger.log('⚠️ Tabla de tipos de ejercicio vacía, sincronizando...');
      await this.syncExerciseTypes();
    } else {
      this.logger.log(
        `✅ Tipos de ejercicio ya cargados (${exerciseTypeCount} registros)`,
      );
    }

    const exerciseCount = await this.exerciseRepository.count();
    if (exerciseCount === 0) {
      this.logger.log('⚠️ Tabla de ejercicios vacía, sincronizando...');
      await this.syncWithExerciseDB();
    } else {
      this.logger.log(`✅ Ejercicios ya cargados (${exerciseCount} registros)`);
    }

    this.logger.log('✅ Verificación de datos completada');
  }

  // ==================== MÉTODOS PRINCIPALES ====================

  async findAll(): Promise<ExerciseEntity[]> {
    const exercises = await this.exerciseRepository
      .createQueryBuilder('exercise')
      .select([
        'exercise.id',
        'exercise.name',
        'exercise.imageUrl',
        'exercise.giftUrl',
        'exercise.videoUrl',
        'exercise.equipments',
        'exercise.bodyParts',
        'exercise.targetMuscles',
        'exercise.secondaryMuscles',
      ])
      .orderBy('exercise.name', 'ASC')
      .getMany();

    return this.sortByPopularity(exercises);
  }

  async search(params: ExerciseSearchParams): Promise<ExerciseEntity[]> {
    const query = this.exerciseRepository
      .createQueryBuilder('exercise')
      .select([
        'exercise.id',
        'exercise.name',
        'exercise.imageUrl',
        'exercise.giftUrl',
        'exercise.videoUrl',
        'exercise.equipments',
        'exercise.bodyParts',
        'exercise.targetMuscles',
        'exercise.secondaryMuscles',
      ])
      .orderBy('exercise.name', 'ASC');

    const normalizedName = params.name?.trim().toLowerCase();
    const normalizedEquipment = params.equipment?.trim().toLowerCase();
    const normalizedMuscle = params.muscle?.trim().toLowerCase();

    if (normalizedName) {
      query.andWhere('LOWER(exercise.name) LIKE :name', {
        name: `%${normalizedName}%`,
      });
    }

    if (normalizedEquipment) {
      query.andWhere(
        new Brackets(qb => {
          qb.where(
            `
              EXISTS (
                SELECT 1
                FROM unnest(string_to_array(COALESCE(LOWER(exercise.equipments), ''), ',')) AS equipment_token
                WHERE btrim(equipment_token) = :equipment
              )
            `,
            { equipment: normalizedEquipment },
          ).orWhere(
            `
              EXISTS (
                SELECT 1
                FROM unnest(string_to_array(COALESCE(LOWER(exercise.equipments), ''), ',')) AS equipment_token
                WHERE btrim(equipment_token) LIKE :equipmentPrefix
              )
            `,
            { equipmentPrefix: `${normalizedEquipment} %` },
          );
        }),
      );
    }

    if (normalizedMuscle) {
      query.andWhere(
        new Brackets(qb => {
          qb.where(
            `
              EXISTS (
                SELECT 1
                FROM unnest(string_to_array(COALESCE(LOWER(exercise.targetMuscles), ''), ',')) AS muscle_token
                WHERE btrim(muscle_token) = :muscle
              )
            `,
            { muscle: normalizedMuscle },
          )
            .orWhere(
              `
                EXISTS (
                  SELECT 1
                  FROM unnest(string_to_array(COALESCE(LOWER(exercise.targetMuscles), ''), ',')) AS muscle_token
                  WHERE btrim(muscle_token) LIKE :musclePrefix
                )
              `,
              { musclePrefix: `${normalizedMuscle} %` },
            )
            .orWhere(
              `
                EXISTS (
                  SELECT 1
                  FROM unnest(string_to_array(COALESCE(LOWER(exercise.bodyParts), ''), ',')) AS body_part_token
                  WHERE btrim(body_part_token) = :muscle
                )
              `,
              { muscle: normalizedMuscle },
            )
            .orWhere(
              `
                EXISTS (
                  SELECT 1
                  FROM unnest(string_to_array(COALESCE(LOWER(exercise.bodyParts), ''), ',')) AS body_part_token
                  WHERE btrim(body_part_token) LIKE :musclePrefix
                )
              `,
              { musclePrefix: `${normalizedMuscle} %` },
            );
        }),
      );
    }

    const exercises = await query.getMany();
    return this.sortByPopularity(exercises);
  }

  private normalizeExerciseName(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getPopularityScore(exercise: ExerciseEntity): number {
    const normalizedName = this.normalizeExerciseName(exercise.name || '');

    return POPULAR_EXERCISE_PATTERNS.reduce((total, { pattern, score }) => {
      return normalizedName.includes(pattern) ? total + score : total;
    }, 0);
  }

  private sortByPopularity(exercises: ExerciseEntity[]): ExerciseEntity[] {
    return [...exercises].sort((a, b) => {
      const scoreDiff = this.getPopularityScore(b) - this.getPopularityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.name || '').localeCompare(b.name || '', 'es', {
        sensitivity: 'base',
      });
    });
  }

  async findAllEquipment(): Promise<EquipmentEntity[]> {
    return this.equipmentRepository.find();
  }

  async findAllMuscles(): Promise<MuscleEntity[]> {
    return this.muscleRepository.find();
  }

  async findAllExerciseTypes(): Promise<ExerciseTypeEntity[]> {
    return this.exerciseTypeRepository.find();
  }

  async createCustom(dto: CreateExerciseDto & { imageBase64?: string }) {
    const { v4: uuidv4 } = await import('uuid');

    const equipmentId = dto.equipment?.trim();
    const primaryMuscleId = dto.primaryMuscle?.trim();
    const typeId = dto.type?.trim();

    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      );

    if (!equipmentId || !isUuid(equipmentId)) {
      throw new BadRequestException('equipment debe ser un UUID válido');
    }

    if (!primaryMuscleId || !isUuid(primaryMuscleId)) {
      throw new BadRequestException('primaryMuscle debe ser un UUID válido');
    }

    // Validar equipamiento
    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentId },
    });
    if (!equipment) {
      throw new NotFoundException(`Equipo no encontrado: ${equipmentId}`);
    }

    // Validar músculo principal
    const primaryMuscle = await this.muscleRepository.findOne({
      where: { id: primaryMuscleId },
    });
    if (!primaryMuscle) {
      throw new NotFoundException(
        `Músculo no encontrado: ${primaryMuscleId}`,
      );
    }

    // Obtener músculos secundarios
    let secondaryMuscles: string[] = [];
    if (dto.otherMuscles && dto.otherMuscles.length > 0) {
      const found = await this.muscleRepository.findByIds(dto.otherMuscles);
      secondaryMuscles = found.map(m => m.name);
    }

    // Validar tipo de ejercicio (opcional)
    let exerciseType: ExerciseTypeEntity | null = null;
    if (typeId) {
      if (!isUuid(typeId)) {
        throw new BadRequestException('type debe ser un UUID válido');
      }

      exerciseType = await this.exerciseTypeRepository.findOne({
        where: { id: typeId },
      });

      if (!exerciseType) {
        throw new NotFoundException(`Tipo de ejercicio no encontrado: ${typeId}`);
      }
    }

    // Crear ejercicio
    const exercise = this.exerciseRepository.create({
      id: uuidv4(),
      name: dto.name,
      equipments: [equipment.name],
      targetMuscles: [primaryMuscle.name],
      secondaryMuscles,
      exerciseType: exerciseType?.name,
      bodyParts: [primaryMuscle.name],
      instructions: [],
      giftUrl: undefined,
      imageUrl: dto.imageBase64,
    });

    return this.exerciseRepository.save(exercise);
  }

  // ==================== SINCRONIZACIÓN CON EXERCISEDB ====================

  async syncWithExerciseDB(): Promise<{ message: string; count: number }> {
    try {
      this.logger.log(
        '🚀 Iniciando sincronización con ExerciseDB (API oficial gratuita)...',
      );

      const allExercises = await this.fetchAllExercises();

      if (allExercises.length === 0) {
        this.logger.warn('⚠️ No se obtuvieron ejercicios de ExerciseDB');
        return {
          message: 'No se obtuvieron ejercicios de ExerciseDB',
          count: 0,
        };
      }

      const entities = await this.processExerciseBatch(allExercises);
      await this.saveExercises(entities);

      this.logger.log(
        `✅ ¡Sincronización completada! ${entities.length} ejercicios guardados`,
      );
      return {
        message: `Sincronización completada exitosamente. ${entities.length} ejercicios guardados.`,
        count: entities.length,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error en sincronización: ${error.message}`,
        error.stack,
      );
      return { message: `Error en sincronización: ${error.message}`, count: 0 };
    }
  }

  // 🔄 Método para obtener todos los ejercicios con paginación
  private async fetchAllExercises(): Promise<ExerciseDbItem[]> {
    const baseUrl = 'https://www.exercisedb.dev/api/v1/exercises';
    const limit = 25;
    let offset = 0;
    let allExercises: ExerciseDbItem[] = [];
    let hasMore = true;

    this.logger.log('📡 Obteniendo ejercicios desde ExerciseDB...');

    while (hasMore) {
      const pageNumber = Math.floor(offset / limit) + 1;
      this.logger.log(
        `📄 Página ${pageNumber}: Obteniendo ejercicios ${offset} - ${offset + limit}...`,
      );

      const batchData = await this.fetchExercisePage(baseUrl, limit, offset);

      if (batchData.length === 0) {
        this.logger.log('✅ No hay más ejercicios disponibles');
        break;
      }

      allExercises.push(...batchData);
      this.logger.log(
        `✅ Obtenidos ${batchData.length} ejercicios. Total acumulado: ${allExercises.length}`,
      );

      if (batchData.length < limit) {
        this.logger.log('✅ Última página alcanzada');
        hasMore = false;
      } else {
        offset += limit;
        await this.rateLimitDelay();
      }
    }

    this.logger.log(`📊 Total de ejercicios obtenidos: ${allExercises.length}`);
    return allExercises;
  }

  // 📄 Método para obtener una página de ejercicios con retry
  private async fetchExercisePage(
    baseUrl: string,
    limit: number,
    offset: number,
  ): Promise<ExerciseDbItem[]> {
    const maxRetries = 5;
    let retryCount = 0;
    let response;

    while (retryCount <= maxRetries) {
      try {
        response = await firstValueFrom(
          this.httpService.get(baseUrl, {
            params: { limit, offset },
            timeout: 120000,
          }),
        );

        if (response.status !== 200) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        return this.extractExercisesFromResponse(response.data, offset);
      } catch (error) {
        if (error.response?.status === 429 && retryCount < maxRetries) {
          await this.handleRateLimit(++retryCount, maxRetries);
        } else {
          throw error;
        }
      }
    }

    throw new Error('Max retries alcanzado sin éxito');
  }

  // 📊 Método para extraer ejercicios de diferentes estructuras de respuesta
  private extractExercisesFromResponse(
    responseData: any,
    offset: number,
  ): ExerciseDbItem[] {
    // Log solo en la primera petición
    if (offset === 0) {
      this.logger.log(
        `📊 Estructura de respuesta: ${JSON.stringify(Object.keys(responseData)).substring(0, 200)}`,
      );
    }

    // Intentar diferentes estructuras
    if (Array.isArray(responseData)) {
      return responseData;
    }

    if (responseData.data && Array.isArray(responseData.data)) {
      return responseData.data;
    }

    if (responseData.exercises && Array.isArray(responseData.exercises)) {
      return responseData.exercises;
    }

    this.logger.error(
      'No se encontró array de ejercicios. Claves:',
      Object.keys(responseData),
    );
    this.logger.error(
      'Muestra:',
      JSON.stringify(responseData).substring(0, 500),
    );
    throw new Error(
      'La respuesta de ExerciseDB no contiene un array en el formato esperado',
    );
  }

  // ⏱️ Método para manejar rate limiting con exponential backoff
  private async handleRateLimit(
    retryCount: number,
    maxRetries: number,
  ): Promise<void> {
    const baseDelay = Math.pow(2, retryCount) * 1000;
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    this.logger.warn(
      `⚠️ Rate limit (429) alcanzado. Reintento ${retryCount}/${maxRetries} en ${Math.round(delay / 1000)}s...`,
    );

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // ⏳ Método para delay entre peticiones
  private async rateLimitDelay(): Promise<void> {
    this.logger.log('⏳ Esperando 3 segundos para respetar rate limits...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 🌍 Método para procesar lotes de ejercicios
  private async processExerciseBatch(
    exercises: ExerciseDbItem[],
  ): Promise<ExerciseEntity[]> {
    this.logger.log(
      `🌍 Procesando y traduciendo ${exercises.length} ejercicios...`,
    );

    const batchSize = 50;
    const entities: ExerciseEntity[] = [];

    for (let i = 0; i < exercises.length; i += batchSize) {
      const batch = exercises.slice(i, i + batchSize);

      const batchEntities = await Promise.all(
        batch.map(item => this.mapToExerciseEntity(item)),
      );

      entities.push(...batchEntities);

      const progress = Math.min(i + batchSize, exercises.length);
      this.logger.log(
        `🔄 Procesado lote ${Math.floor(i / batchSize) + 1}: ${progress}/${exercises.length} ejercicios`,
      );
    }

    return entities;
  }

  // 💾 Método para guardar ejercicios en la base de datos
  private async saveExercises(entities: ExerciseEntity[]): Promise<void> {
    this.logger.log('🗑️ Limpiando ejercicios anteriores...');
    await this.exerciseRepository.createQueryBuilder().delete().execute();

    this.logger.log('💾 Guardando ejercicios en la base de datos...');
    await this.exerciseRepository.save(entities, { chunk: 100 });
  }

  private async mapToExerciseEntity(
    data: ExerciseDbItem,
  ): Promise<ExerciseEntity> {
    const { v4: uuidv4 } = await import('uuid');
    const entity = new ExerciseEntity();

    // ✅ SIEMPRE generar un nuevo UUID, ignorar los IDs de ExerciseDB
    entity.id = uuidv4();

    // 🌍 TRADUCIR los campos importantes
    const rawName = this.resolveFirstString(data, ['name', 'exerciseName', 'title']);
    entity.name = await this.translateToSpanish(rawName || 'Ejercicio');

    // 📹 GIF URL - La API gratuita devuelve gifUrl directamente
    const gifUrl = this.resolveGifUrl(data);
    if (gifUrl) {
      entity.giftUrl = gifUrl;
    }

    // 🎥 Video URL
    entity.videoUrl = data.videoUrl;

    // Traducir arrays
    entity.targetMuscles = await this.translateArray(data.targetMuscles || []);
    entity.bodyParts = await this.translateArray(data.bodyParts || []);
    entity.equipments = await this.translateArray(data.equipments || []);
    entity.secondaryMuscles = await this.translateArray(
      data.secondaryMuscles || [],
    );
    entity.instructions = await this.translateArray(data.instructions || []);

    // Traducir tipo de ejercicio
    if (data.exerciseType) {
      entity.exerciseType = await this.translateToSpanish(data.exerciseType);
    }

    // Traducir arrays opcionales
    entity.keywords = await this.translateArray(data.keywords || []);
    entity.exerciseTips = await this.translateArray(data.exerciseTips || []);
    entity.variations = await this.translateArray(data.variations || []);

    // Traducir overview si existe
    if (data.overview) {
      entity.overview = await this.translateToSpanish(data.overview);
    }

    entity.relatedExerciseIds = data.relatedExerciseIds || [];

    // 🖼️ Procesar imagen - La API incluye imageUrl directamente
    const imageUrl = this.resolveImageUrl(data);
    if (imageUrl) {
      const fullImageUrl = this.buildAbsoluteImageUrl(imageUrl);
      try {
        this.logger.debug(`Descargando imagen: ${fullImageUrl}`);

        const imageBuffer = await this.downloadAndConvertImage(fullImageUrl);
        entity.imageUrl = imageBuffer.toString('base64');
      } catch (error) {
        this.logger.warn(
          `No se pudo procesar imagen para ${data.name}: ${error.message}`,
        );

        // Mantener URL remota para no dejar imageUrl vacío
        entity.imageUrl = fullImageUrl;

        // Si falla la imagen, intentar usar el GIF como backup
        if (gifUrl) {
          try {
            const gifBuffer = await this.downloadAndConvertImage(gifUrl);
            entity.imageUrl = gifBuffer.toString('base64');
            this.logger.debug(
              `Usando GIF como imagen de respaldo para ${data.name}`,
            );
          } catch (gifError) {
            this.logger.warn(
              `Tampoco se pudo usar el GIF: ${gifError.message}`,
            );
          }
        }
      }
    } else if (gifUrl) {
      // Si no hay imageUrl, usar el GIF directamente
      try {
        const gifBuffer = await this.downloadAndConvertImage(gifUrl);
        entity.imageUrl = gifBuffer.toString('base64');
      } catch (error) {
        this.logger.warn(
          `No se pudo procesar GIF para ${data.name}: ${error.message}`,
        );
        // Mantener URL remota para no perder imagen en cliente
        entity.imageUrl = gifUrl;
      }
    }

    return entity;
  }

  private resolveFirstString(
    data: ExerciseDbItem,
    keys: string[],
  ): string | undefined {
    const record = data as unknown as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private resolveGifUrl(data: ExerciseDbItem): string | undefined {
    const gif = this.resolveFirstString(data, ['gifUrl', 'gif_url', 'gif']);
    if (!gif) return undefined;
    return this.buildAbsoluteImageUrl(gif);
  }

  private resolveImageUrl(data: ExerciseDbItem): string | undefined {
    const directImage = this.resolveFirstString(data, ['imageUrl', 'image']);
    if (directImage) return directImage;

    const images = (data as unknown as Record<string, unknown>).images;
    if (Array.isArray(images)) {
      const firstImage = images.find(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      );
      if (firstImage) return firstImage;
    }

    return undefined;
  }

  private buildAbsoluteImageUrl(url: string): string {
    if (!url || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    const cleanUrl = url.replace(/^\/+/, '');
    return `https://static.exercisedb.dev/images/${cleanUrl}`;
  }

  private async downloadAndConvertImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
        }),
      );

      const pngBuffer = await sharp(response.data)
        .png()
        .resize(400, 400, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();

      return pngBuffer;
    } catch (error) {
      throw new Error(`Error procesando imagen: ${error.message}`);
    }
  }

  /**
   * Traduce un array de textos
   */
  private async translateArray(texts: string[]): Promise<string[]> {
    if (!texts || texts.length === 0) return texts;

    try {
      // Procesar cada texto individualmente para usar traducciones personalizadas
      const translations = await Promise.all(
        texts.map(async text => {
          const lowerText = text.toLowerCase().trim();

          // Verificar si existe una traducción personalizada
          if (this.customTranslations[lowerText]) {
            return this.customTranslations[lowerText];
          }

          // Si no, usar Google Translate
          try {
            const translation = await this.translateWithRetry(text);
            return this.capitalizeFirst(translation);
          } catch (error) {
            this.logger.warn(
              `Fallback de traduccion para "${text}": ${error.message}`,
            );
            if (this.strictTranslation) {
              throw error;
            }
            return this.translateByDictionaryFallback(text);
          }
        }),
      );

      return translations;
    } catch (error) {
      this.logger.warn(`Error traduciendo array: ${error.message}`);
      return texts.map(t => this.translateByDictionaryFallback(t));
    }
  }

  /**
   * Capitaliza la primera letra de un texto
   */
  private capitalizeFirst(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  async syncBodyParts(): Promise<{ message: string; count: number }> {
    try {
      this.logger.log('🔄 Sincronizando músculos (body parts)...');

      // ✅ Datos estáticos con traducciones incluidas
      const bodyParts = [
        {
          nameEn: 'BACK',
          nameEs: 'Espalda',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/back.webp',
        },
        {
          nameEn: 'CALVES',
          nameEs: 'Pantorrillas',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/calves.webp',
        },
        {
          nameEn: 'CHEST',
          nameEs: 'Pecho',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/chest.webp',
        },
        {
          nameEn: 'FOREARMS',
          nameEs: 'Antebrazos',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/forearms.webp',
        },
        {
          nameEn: 'HIPS',
          nameEs: 'Caderas',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/hips.webp',
        },
        {
          nameEn: 'NECK',
          nameEs: 'Cuello',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/neck.webp',
        },
        {
          nameEn: 'SHOULDERS',
          nameEs: 'Hombros',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/shoulders.webp',
        },
        {
          nameEn: 'THIGHS',
          nameEs: 'Muslos',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/thighs.webp',
        },
        {
          nameEn: 'WAIST',
          nameEs: 'Cintura',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/waist.webp',
        },
        {
          nameEn: 'HANDS',
          nameEs: 'Manos',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/hands.webp',
        },
        {
          nameEn: 'FEET',
          nameEs: 'Pies',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/feet.webp',
        },
        {
          nameEn: 'FACE',
          nameEs: 'Cara',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/face.webp',
        },
        {
          nameEn: 'FULL BODY',
          nameEs: 'Cuerpo completo',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/fullbody.webp',
        },
        {
          nameEn: 'BICEPS',
          nameEs: 'Bíceps',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/biceps.webp',
        },
        {
          nameEn: 'UPPER ARMS',
          nameEs: 'Brazos superiores',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/biceps.webp',
        },
        {
          nameEn: 'TRICEPS',
          nameEs: 'Tríceps',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/triceps.webp',
        },
        {
          nameEn: 'HAMSTRINGS',
          nameEs: 'Isquiotibiales',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/hamstrings.webp',
        },
        {
          nameEn: 'QUADRICEPS',
          nameEs: 'Cuádriceps',
          imageUrl: 'https://cdn.exercisedb.dev/bodyparts/quadriceps.webp',
        },
      ];

      this.logger.log(`📊 Procesando ${bodyParts.length} músculos`);

      await this.muscleRepository.clear();

      const entities: MuscleEntity[] = [];

      for (const item of bodyParts) {
        const { v4: uuidv4 } = await import('uuid');

        this.logger.log(`✓ ${item.nameEn} → ${item.nameEs}`);

        let imageBase64: string | undefined;
        if (item.imageUrl) {
          try {
            imageBase64 = await this.downloadAndConvertToBase64(item.imageUrl);
          } catch (error) {
            this.logger.warn(`⚠️ Error con imagen de ${item.nameEn}`);
          }
        }

        entities.push(
          this.muscleRepository.create({
            id: uuidv4(),
            name: item.nameEs, // ✅ Uso directo sin traducción
            image: imageBase64,
          }),
        );
      }

      await this.muscleRepository.save(entities);
      this.logger.log(`✅ ${entities.length} músculos sincronizados`);

      return {
        message: `${entities.length} músculos sincronizados exitosamente`,
        count: entities.length,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error sincronizando músculos: ${error.message}`,
        error.stack,
      );
      return {
        message: `Error sincronizando músculos: ${error.message}`,
        count: 0,
      };
    }
  }

  async syncEquipment(): Promise<{ message: string; count: number }> {
    try {
      this.logger.log('🔄 Sincronizando equipamiento...');

      // ✅ Datos estáticos con traducciones incluidas
      const equipments = [
        {
          nameEn: 'ASSISTED',
          nameEs: 'Asistido',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-assisted.webp',
        },
        {
          nameEn: 'BAND',
          nameEs: 'Banda elástica',
          imageUrl: 'https://cdn.exercisedb.dev/equipments/equipment-band.webp',
        },
        {
          nameEn: 'BARBELL',
          nameEs: 'Barra',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-barbell.webp',
        },
        {
          nameEn: 'BATTLING ROPE',
          nameEs: 'Cuerda de batalla',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Battling-Rope.webp',
        },
        {
          nameEn: 'BODY WEIGHT',
          nameEs: 'Peso corporal',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Body-weight.webp',
        },
        {
          nameEn: 'BOSU BALL',
          nameEs: 'Balón Bosu',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Bosu-ball.webp',
        },
        {
          nameEn: 'CABLE',
          nameEs: 'Cable',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Cable-1.webp',
        },
        {
          nameEn: 'DUMBBELL',
          nameEs: 'Mancuerna',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Dumbbell.webp',
        },
        {
          nameEn: 'EZ BARBELL',
          nameEs: 'Barra Z',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-EZ-Barbell.webp',
        },
        {
          nameEn: 'HAMMER',
          nameEs: 'Martillo',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-hammer.webp',
        },
        {
          nameEn: 'KETTLEBELL',
          nameEs: 'Pesa rusa',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Kettlebell.webp',
        },
        {
          nameEn: 'LEVERAGE MACHINE',
          nameEs: 'Máquina de palanca',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Leverage-machine.webp',
        },
        {
          nameEn: 'MEDICINE BALL',
          nameEs: 'Balón medicinal',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Medicine-Ball.webp',
        },
        {
          nameEn: 'OLYMPIC BARBELL',
          nameEs: 'Barra olímpica',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Olympic-barbell.webp',
        },
        {
          nameEn: 'POWER SLED',
          nameEs: 'Trineo de potencia',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Power-Sled.webp',
        },
        {
          nameEn: 'RESISTANCE BAND',
          nameEs: 'Banda de resistencia',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Resistance-Band.webp',
        },
        {
          nameEn: 'ROLL',
          nameEs: 'Rodillo',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Massage-Roller.webp',
        },
        {
          nameEn: 'ROLLBALL',
          nameEs: 'Bola de masaje',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Roll-Ball.webp',
        },
        {
          nameEn: 'ROPE',
          nameEs: 'Cuerda',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Jump-Rope.webp',
        },
        {
          nameEn: 'SLED MACHINE',
          nameEs: 'Máquina trineo',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Sled-machine.webp',
        },
        {
          nameEn: 'SMITH MACHINE',
          nameEs: 'Máquina Smith',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Smith-machine.webp',
        },
        {
          nameEn: 'STABILITY BALL',
          nameEs: 'Balón de estabilidad',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Stability-ball.webp',
        },
        {
          nameEn: 'STICK',
          nameEs: 'Palo',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Stick.webp',
        },
        {
          nameEn: 'SUSPENSION',
          nameEs: 'Suspensión',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Suspension.webp',
        },
        {
          nameEn: 'TRAP BAR',
          nameEs: 'Barra hexagonal',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Trap-bar.webp',
        },
        {
          nameEn: 'VIBRATE PLATE',
          nameEs: 'Plataforma vibratoria',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Vibrate-Plate.webp',
        },
        {
          nameEn: 'WEIGHTED',
          nameEs: 'Con peso',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Weighted.webp',
        },
        {
          nameEn: 'WHEEL ROLLER',
          nameEs: 'Rueda abdominal',
          imageUrl:
            'https://cdn.exercisedb.dev/equipments/equipment-Wheel-Roller.webp',
        },
      ];

      this.logger.log(`📊 Procesando ${equipments.length} equipamientos`);

      await this.equipmentRepository.clear();

      const entities: EquipmentEntity[] = [];

      for (const item of equipments) {
        const { v4: uuidv4 } = await import('uuid');

        this.logger.log(`✓ ${item.nameEn} → ${item.nameEs}`);

        let imageBase64: string | undefined;
        if (item.imageUrl) {
          try {
            imageBase64 = await this.downloadAndConvertToBase64(item.imageUrl);
          } catch (error) {
            this.logger.warn(`⚠️ Error con imagen de ${item.nameEn}`);
          }
        }

        entities.push(
          this.equipmentRepository.create({
            id: uuidv4(),
            name: item.nameEs, // ✅ Uso directo sin traducción
            image: imageBase64,
          }),
        );
      }

      await this.equipmentRepository.save(entities);
      this.logger.log(`✅ ${entities.length} equipamientos sincronizados`);

      return {
        message: `${entities.length} equipamientos sincronizados exitosamente`,
        count: entities.length,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error sincronizando equipamiento: ${error.message}`,
      );
      throw error;
    }
  }

  async syncExerciseTypes(): Promise<{ message: string; count: number }> {
    try {
      this.logger.log('🔄 Sincronizando tipos de ejercicio...');

      // ✅ Datos estáticos con traducciones incluidas
      const exerciseTypes = [
        {
          nameEn: 'STRENGTH',
          nameEs: 'Fuerza',
          imageUrl: 'https://cdn.exercisedb.dev/exercisetypes/strength.webp',
        },
        {
          nameEn: 'CARDIO',
          nameEs: 'Cardio',
          imageUrl: 'https://cdn.exercisedb.dev/exercisetypes/cardio.webp',
        },
        {
          nameEn: 'PLYOMETRICS',
          nameEs: 'Pliometría',
          imageUrl: 'https://cdn.exercisedb.dev/exercisetypes/plyometrics.webp',
        },
        {
          nameEn: 'STRETCHING',
          nameEs: 'Estiramiento',
          imageUrl: 'https://cdn.exercisedb.dev/exercisetypes/stretching.webp',
        },
        {
          nameEn: 'WEIGHTLIFTING',
          nameEs: 'Levantamiento de pesas',
          imageUrl:
            'https://cdn.exercisedb.dev/exercisetypes/weightlifting.webp',
        },
        {
          nameEn: 'YOGA',
          nameEs: 'Yoga',
          imageUrl: 'https://cdn.exercisedb.dev/exercisetypes/yoga.webp',
        },
        {
          nameEn: 'AEROBIC',
          nameEs: 'Aeróbico',
          imageUrl: 'https://cdn.exercisedb.dev/exercisetypes/aerobic.webp',
        },
      ];

      this.logger.log(
        `📊 Procesando ${exerciseTypes.length} tipos de ejercicio`,
      );

      await this.exerciseTypeRepository.clear();

      const entities: ExerciseTypeEntity[] = [];

      for (const item of exerciseTypes) {
        const { v4: uuidv4 } = await import('uuid');

        this.logger.log(`✓ ${item.nameEn} → ${item.nameEs}`);

        let imageBase64: string | undefined;
        if (item.imageUrl) {
          try {
            imageBase64 = await this.downloadAndConvertToBase64(item.imageUrl);
          } catch (error) {
            this.logger.warn(`⚠️ Error con imagen de ${item.nameEn}`);
          }
        }

        entities.push(
          this.exerciseTypeRepository.create({
            id: uuidv4(),
            name: item.nameEs, // ✅ Uso directo sin traducción
            image: imageBase64,
          }),
        );
      }

      await this.exerciseTypeRepository.save(entities);
      this.logger.log(`✅ ${entities.length} tipos de ejercicio sincronizados`);

      return {
        message: `${entities.length} tipos de ejercicio sincronizados exitosamente`,
        count: entities.length,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error sincronizando tipos de ejercicio: ${error.message}`,
      );
      throw error;
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Normaliza texto: primera letra mayúscula, resto minúscula
   */
  private normalizeText(text: string): string {
    if (!text) return text;

    // Convertir todo a minúsculas primero
    const lowerText = text.toLowerCase();

    // Capitalizar solo la primera letra
    return lowerText.charAt(0).toUpperCase() + lowerText.slice(1);
  }

  /**
   * Traduce texto de inglés a español con normalización
   */
  private async translateToSpanish(text: string): Promise<string> {
    if (!text) return text;

    try {
      const lowerText = text.toLowerCase().trim();

      // Verificar diccionario personalizado
      if (this.customTranslations[lowerText]) {
        return this.customTranslations[lowerText];
      }

      // Usar Google Translate
      const translation = await this.translateWithRetry(text);

      // Normalizar: primera mayúscula, resto minúsculas
      return this.normalizeText(translation);
    } catch (error) {
      this.logger.warn(`Error traduciendo "${text}": ${error.message}`);
      if (this.strictTranslation) {
        throw error;
      }
      return this.translateByDictionaryFallback(text);
    }
  }

  private async translateWithRetry(text: string): Promise<string> {
    const maxRetries = 3;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxRetries) {
      try {
        const [translation] = await this.translator.translate(text, {
          from: 'en',
          to: 'es',
        });
        return translation;
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt >= maxRetries) break;
        const delayMs = 500 * attempt;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw new Error(
      `Google Translate failed after ${maxRetries} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  /**
   * Fallback cuando Google Translate falla:
   * traduce palabra por palabra usando el diccionario personalizado.
   */
  private translateByDictionaryFallback(text: string): string {
    if (!text) return text;

    const translated = text.replace(/[A-Za-z][A-Za-z\s'-]*/g, segment => {
      const value = segment.toLowerCase().trim();
      if (!value) return segment;
      if (this.customTranslations[value]) {
        return this.customTranslations[value];
      }

      const parts = value.split(/\s+/).map(part => {
        if (this.customTranslations[part]) {
          return this.customTranslations[part];
        }
        return part;
      });

      return parts.join(' ');
    });

    return this.capitalizeFirst(translated);
  }

  /**
   * Descarga imagen WebP y la convierte a PNG base64
   */
  private async downloadAndConvertToBase64(imageUrl: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
        }),
      );

      const pngBuffer = await sharp(response.data)
        .png()
        .resize(200, 200, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .toBuffer();

      return pngBuffer.toString('base64');
    } catch (error) {
      this.logger.error(`Error descargando imagen: ${error.message}`);
      throw error;
    }
  }
}
