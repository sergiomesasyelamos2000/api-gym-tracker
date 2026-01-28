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
    // Sincronizar datos al iniciar la aplicación (opcional)
    /* await this.syncWithExerciseDB();
    await this.syncBodyParts();
    await this.syncEquipment();
    await this.syncExerciseTypes(); */
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

      const baseUrl = 'https://www.exercisedb.dev/api/v1/exercises';

      this.logger.log('📡 Obteniendo ejercicios desde ExerciseDB...');

      // 🔄 Implementar paginación para obtener TODOS los ejercicios
      let allExercises: ExerciseDbItem[] = [];
      let offset = 0;
      const limit = 100; // Cantidad por página
      let hasMore = true;

      while (hasMore) {
        this.logger.log(
          `📄 Página ${Math.floor(offset / limit) + 1}: Obteniendo ejercicios ${offset} - ${offset + limit}...`,
        );

        const response = await firstValueFrom(
          this.httpService.get(baseUrl, {
            params: {
              limit: limit,
              offset: offset,
            },
            timeout: 120000, // 120 segundos
          }),
        );

        if (response.status !== 200) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        // La API puede devolver diferentes estructuras de respuesta
        const responseData = response.data;

        // Log para debug: ver la estructura de la respuesta
        if (offset === 0) {
          this.logger.log(
            `📊 Estructura de respuesta: ${JSON.stringify(Object.keys(responseData)).substring(0, 200)}`,
          );
        }

        // Intentar extraer el array de ejercicios de diferentes formas
        let batchData: ExerciseDbItem[];

        if (Array.isArray(responseData)) {
          // Si response.data ya es un array
          batchData = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          // Si tiene una propiedad 'data' que es un array
          batchData = responseData.data;
        } else if (
          responseData.exercises &&
          Array.isArray(responseData.exercises)
        ) {
          // Si tiene una propiedad 'exercises' que es un array
          batchData = responseData.exercises;
        } else {
          this.logger.error(
            'No se encontró array de ejercicios en la respuesta. Claves disponibles:',
            Object.keys(responseData),
          );
          this.logger.error(
            'Muestra de la respuesta:',
            JSON.stringify(responseData).substring(0, 500),
          );
          throw new Error(
            'La respuesta de ExerciseDB no contiene un array de ejercicios en el formato esperado',
          );
        }

        // Si no hay datos, terminamos
        if (batchData.length === 0) {
          this.logger.log('✅ No hay más ejercicios disponibles');
          hasMore = false;
          break;
        }

        allExercises.push(...batchData);

        this.logger.log(
          `✅ Obtenidos ${batchData.length} ejercicios. Total acumulado: ${allExercises.length}`,
        );

        // Si obtuvimos menos ejercicios que el límite, ya no hay más
        if (batchData.length < limit) {
          this.logger.log('✅ Última página alcanzada');
          hasMore = false;
        } else {
          offset += limit;
          // Pequeña pausa para no saturar la API (ser amables)
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      this.logger.log(
        `📊 Total de ejercicios obtenidos: ${allExercises.length}`,
      );

      if (allExercises.length === 0) {
        this.logger.warn('⚠️  No se obtuvieron ejercicios de ExerciseDB');
        return {
          message: 'No se obtuvieron ejercicios de ExerciseDB',
          count: 0,
        };
      }

      this.logger.log(
        `🌍 Procesando y traduciendo ${allExercises.length} ejercicios...`,
      );

      const batchSize = 50;
      const entities: ExerciseEntity[] = [];

      for (let i = 0; i < allExercises.length; i += batchSize) {
        const batch = allExercises.slice(i, i + batchSize);

        const batchEntities = await Promise.all(
          batch.map(async (item: ExerciseDbItem) => {
            return await this.mapToExerciseEntity(item);
          }),
        );

        entities.push(...batchEntities);

        const progress = Math.min(i + batchSize, allExercises.length);
        this.logger.log(
          `🔄 Procesado lote ${Math.floor(i / batchSize) + 1}: ${progress}/${allExercises.length} ejercicios`,
        );
      }

      // Limpiar la base de datos antes de insertar los nuevos ejercicios
      this.logger.log('🗑️  Limpiando ejercicios anteriores...');
      await this.exerciseRepository.createQueryBuilder().delete().execute();

      // Guardar los nuevos ejercicios en lotes
      this.logger.log('💾 Guardando ejercicios en la base de datos...');
      await this.exerciseRepository.save(entities, { chunk: 100 });

      this.logger.log(
        `✅ ¡Sincronización completada! ${entities.length} ejercicios guardados en la base de datos`,
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

      return {
        message: `Error en sincronización: ${error.message}`,
        count: 0,
      };
    }
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
      this.logger.log(
        '🚀 Sincronizando partes del cuerpo desde ExerciseDB v2...',
      );

      const response = await firstValueFrom(
        this.httpService.get('https://v2.exercisedb.dev/api/v1/bodyparts', {
          timeout: 30000,
        }),
      );

      if (!response.data.success || !response.data.data) {
        throw new Error('Respuesta inválida de la API');
      }

      const bodyParts = response.data.data;
      this.logger.log(`📊 Obtenidas ${bodyParts.length} partes del cuerpo`);

      await this.muscleRepository.clear();

      const batchSize = 5;
      const entities: MuscleEntity[] = [];

      for (let i = 0; i < bodyParts.length; i += batchSize) {
        const batch = bodyParts.slice(i, i + batchSize);

        const batchEntities = await Promise.all(
          batch.map(async (item: BodyPartItem) => {
            const { v4: uuidv4 } = await import('uuid');

            // 🔥 Usar el mismo método de traducción que syncWithExerciseDB
            const translatedName = await this.translateToSpanish(item.name);
            this.logger.log(`✓ ${item.name} → ${translatedName}`);

            let imageBase64: string | undefined;
            if (item.imageUrl) {
              try {
                imageBase64 = await this.downloadAndConvertToBase64(
                  item.imageUrl,
                );
              } catch (error) {
                this.logger.warn(`⚠️ Error con imagen de ${item.name}`);
              }
            }

            return this.muscleRepository.create({
              id: uuidv4(),
              name: translatedName, // ✅ Ahora usa traducción consistente
              image: imageBase64,
            });
          }),
        );

        entities.push(...batchEntities);
        this.logger.log(
          `🔄 Procesado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(bodyParts.length / batchSize)}`,
        );
      }

      await this.muscleRepository.save(entities);
      this.logger.log(`✅ ${entities.length} partes del cuerpo sincronizadas`);

      return {
        message: `${entities.length} partes del cuerpo sincronizadas exitosamente`,
        count: entities.length,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error sincronizando partes del cuerpo: ${error.message}`,
      );
      throw error;
    }
  }

  async syncEquipment(): Promise<{ message: string; count: number }> {
    try {
      this.logger.log('🚀 Sincronizando equipamiento desde ExerciseDB v2...');

      const response = await firstValueFrom(
        this.httpService.get('https://v2.exercisedb.dev/api/v1/equipments', {
          timeout: 30000,
        }),
      );

      if (!response.data.success || !response.data.data) {
        throw new Error('Respuesta inválida de la API');
      }

      const equipments = response.data.data;
      this.logger.log(`📊 Obtenidos ${equipments.length} equipamientos`);

      await this.equipmentRepository.clear();

      const batchSize = 5;
      const entities: EquipmentEntity[] = [];

      for (let i = 0; i < equipments.length; i += batchSize) {
        const batch = equipments.slice(i, i + batchSize);

        const batchEntities = await Promise.all(
          batch.map(async (item: EquipmentItem) => {
            const { v4: uuidv4 } = await import('uuid');

            // 🔥 Usar el mismo método de traducción que syncWithExerciseDB
            const translatedName = await this.translateToSpanish(item.name);
            this.logger.log(`✓ ${item.name} → ${translatedName}`);

            let imageBase64: string | undefined;
            if (item.imageUrl) {
              try {
                imageBase64 = await this.downloadAndConvertToBase64(
                  item.imageUrl,
                );
              } catch (error) {
                this.logger.warn(`⚠️ Error con imagen de ${item.name}`);
              }
            }

            return this.equipmentRepository.create({
              id: uuidv4(),
              name: translatedName, // ✅ Ahora usa traducción consistente
              image: imageBase64,
            });
          }),
        );

        entities.push(...batchEntities);
        this.logger.log(
          `🔄 Procesado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(equipments.length / batchSize)}`,
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
      this.logger.log(
        '🚀 Sincronizando tipos de ejercicio desde ExerciseDB v2...',
      );

      const response = await firstValueFrom(
        this.httpService.get('https://v2.exercisedb.dev/api/v1/exercisetypes', {
          timeout: 30000,
        }),
      );

      if (!response.data.success || !response.data.data) {
        throw new Error('Respuesta inválida de la API');
      }

      const exerciseTypes = response.data.data;
      this.logger.log(
        `📊 Obtenidos ${exerciseTypes.length} tipos de ejercicio`,
      );

      await this.exerciseTypeRepository.clear();

      const batchSize = 5;
      const entities: ExerciseTypeEntity[] = [];

      for (let i = 0; i < exerciseTypes.length; i += batchSize) {
        const batch = exerciseTypes.slice(i, i + batchSize);

        const batchEntities = await Promise.all(
          batch.map(async (item: ExerciseTypeItem) => {
            const { v4: uuidv4 } = await import('uuid');

            // 🔥 Usar el mismo método de traducción que syncWithExerciseDB
            const translatedName = await this.translateToSpanish(item.name);
            this.logger.log(`✓ ${item.name} → ${translatedName}`);

            let imageBase64: string | undefined;
            if (item.imageUrl) {
              try {
                imageBase64 = await this.downloadAndConvertToBase64(
                  item.imageUrl,
                );
              } catch (error) {
                this.logger.warn(`⚠️ Error con imagen de ${item.name}`);
              }
            }

            return this.exerciseTypeRepository.create({
              id: uuidv4(),
              name: translatedName, // ✅ Ahora usa traducción consistente
              image: imageBase64,
            });
          }),
        );

        entities.push(...batchEntities);
        this.logger.log(
          `🔄 Procesado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(exerciseTypes.length / batchSize)}`,
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
