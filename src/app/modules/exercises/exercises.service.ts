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
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

const sharp = require('sharp');

interface ExerciseDbItem {
  name: string;
  gifUrl?: string;
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
}

interface BodyPartItem {
  name: string;
  imageUrl?: string;
}

interface EquipmentItem {
  name: string;
  imageUrl?: string;
}

interface ExerciseTypeItem {
  name: string;
  imageUrl?: string;
}

@Injectable()
export class ExercisesService implements OnModuleInit {
  private readonly logger = new Logger(ExercisesService.name);
  private readonly translator: translate.Translate;

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
    this.translator = new translate.Translate({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
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
    return this.exerciseRepository.find();
  }

  async searchByName(name: string): Promise<ExerciseEntity[]> {
    return this.exerciseRepository
      .createQueryBuilder('exercise')
      .where('LOWER(exercise.name) LIKE LOWER(:name)', { name: `%${name}%` })
      .orderBy('exercise.name', 'ASC')
      .getMany();
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

    // Validar equipamiento
    const equipment = await this.equipmentRepository.findOne({
      where: { id: dto.equipment },
    });
    if (!equipment) {
      throw new NotFoundException(`Equipo no encontrado: ${dto.equipment}`);
    }

    // Validar músculo principal
    const primaryMuscle = await this.muscleRepository.findOne({
      where: { id: dto.primaryMuscle },
    });
    if (!primaryMuscle) {
      throw new NotFoundException(
        `Músculo no encontrado: ${dto.primaryMuscle}`,
      );
    }

    // Obtener músculos secundarios
    let secondaryMuscles: string[] = [];
    if (dto.otherMuscles && dto.otherMuscles.length > 0) {
      const found = await this.muscleRepository.findByIds(dto.otherMuscles);
      secondaryMuscles = found.map(m => m.name);
    }

    // Validar tipo de ejercicio
    const exerciseType = await this.exerciseTypeRepository.findOne({
      where: { id: dto.type },
    });
    if (!exerciseType) {
      throw new NotFoundException(
        `Tipo de ejercicio no encontrado: ${dto.type}`,
      );
    }

    // Crear ejercicio
    const exercise = this.exerciseRepository.create({
      id: uuidv4(),
      name: dto.name,
      equipments: [equipment.name],
      targetMuscles: [primaryMuscle.name],
      secondaryMuscles,
      exerciseType: exerciseType.name,
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
    entity.name = await this.translateToSpanish(data.name);

    // 📹 GIF URL - La API gratuita devuelve gifUrl directamente
    if (data.gifUrl) {
      entity.giftUrl = data.gifUrl;
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
    if (data.imageUrl) {
      try {
        // La imageUrl puede ser una URL completa o relativa
        let fullImageUrl = data.imageUrl;

        // Si es una URL relativa, construir la URL completa
        if (!fullImageUrl.startsWith('http')) {
          fullImageUrl = `https://static.exercisedb.dev/images/${fullImageUrl}`;
        }

        this.logger.debug(`Descargando imagen: ${fullImageUrl}`);

        const imageBuffer = await this.downloadAndConvertImage(fullImageUrl);
        entity.imageUrl = imageBuffer.toString('base64');
      } catch (error) {
        this.logger.warn(
          `No se pudo procesar imagen para ${data.name}: ${error.message}`,
        );

        // Si falla la imagen, intentar usar el GIF como backup
        if (data.gifUrl) {
          try {
            const gifBuffer = await this.downloadAndConvertImage(data.gifUrl);
            entity.imageUrl = gifBuffer.toString('base64');
            this.logger.debug(
              `Usando GIF como imagen de respaldo para ${data.name}`,
            );
          } catch (gifError) {
            this.logger.warn(
              `Tampoco se pudo usar el GIF: ${gifError.message}`,
            );
            entity.imageUrl = undefined;
          }
        } else {
          entity.imageUrl = undefined;
        }
      }
    } else if (data.gifUrl) {
      // Si no hay imageUrl, usar el GIF directamente
      try {
        const gifBuffer = await this.downloadAndConvertImage(data.gifUrl);
        entity.imageUrl = gifBuffer.toString('base64');
      } catch (error) {
        this.logger.warn(
          `No se pudo procesar GIF para ${data.name}: ${error.message}`,
        );
        entity.imageUrl = undefined;
      }
    }

    return entity;
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
            const [translation] = await this.translator.translate(text, {
              from: 'en',
              to: 'es',
            });
            return this.capitalizeFirst(translation);
          } catch (error) {
            return this.capitalizeFirst(text);
          }
        }),
      );

      return translations;
    } catch (error) {
      this.logger.warn(`Error traduciendo array: ${error.message}`);
      return texts.map(t => this.capitalizeFirst(t));
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
      const [translation] = await this.translator.translate(text, {
        from: 'en',
        to: 'es',
      });

      // Normalizar: primera mayúscula, resto minúsculas
      return this.normalizeText(translation);
    } catch (error) {
      this.logger.warn(`Error traduciendo "${text}": ${error.message}`);
      return this.normalizeText(text);
    }
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
