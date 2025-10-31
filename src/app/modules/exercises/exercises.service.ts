import {
  CreateExerciseDto,
  EquipmentEntity,
  ExerciseEntity,
  ExerciseRequestDto,
  ExerciseTypeEntity,
  MuscleEntity,
} from '@app/entity-data-models';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as fs from 'fs';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { v2 as translate } from '@google-cloud/translate';

const sharp = require('sharp');

@Injectable()
export class ExercisesService implements OnModuleInit {
  private readonly logger = new Logger(ExercisesService.name);
  private readonly translator: translate.Translate;

  // Diccionario de traducciones personalizadas para palabras específicas
  private readonly customTranslations: { [key: string]: string } = {
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
    cardio: 'Cardio',
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
    // Inicializa el traductor de Google Cloud
    this.translator = new translate.Translate({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  async onModuleInit() {
    //await this.syncWithExerciseDB();
  }

  /**
   * Capitaliza la primera letra de un texto
   */
  private capitalizeFirst(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Traduce un texto de inglés a español
   */
  private async translateToSpanish(text: string): Promise<string> {
    if (!text) return text;

    try {
      // Verificar si existe una traducción personalizada
      const lowerText = text.toLowerCase().trim();
      if (this.customTranslations[lowerText]) {
        return this.customTranslations[lowerText];
      }

      // Si no, usar Google Translate
      const [translation] = await this.translator.translate(text, {
        from: 'en',
        to: 'es',
      });

      // Capitalizar la primera letra del resultado
      return this.capitalizeFirst(translation);
    } catch (error) {
      this.logger.warn(`Error traduciendo "${text}": ${error.message}`);
      return this.capitalizeFirst(text); // Devolver el texto original capitalizado si falla
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

    // 1. Obtener nombres de Equipment
    const equipment = await this.equipmentRepository.findOne({
      where: { id: dto.equipment },
    });
    if (!equipment)
      throw new NotFoundException(`Equipo no encontrado: ${dto.equipment}`);

    // 2. Obtener nombre del músculo primario
    const primaryMuscle = await this.muscleRepository.findOne({
      where: { id: dto.primaryMuscle },
    });
    if (!primaryMuscle)
      throw new NotFoundException(
        `Músculo no encontrado: ${dto.primaryMuscle}`,
      );

    // 3. Obtener nombres de músculos secundarios
    let secondaryMuscles: string[] = [];
    if (dto.otherMuscles && dto.otherMuscles.length > 0) {
      const found = await this.muscleRepository.findByIds(dto.otherMuscles);
      secondaryMuscles = found.map(m => m.name);
    }

    // 4. Obtener tipo de ejercicio
    const exerciseType = await this.exerciseTypeRepository.findOne({
      where: { id: dto.type },
    });
    if (!exerciseType)
      throw new NotFoundException(
        `Tipo de ejercicio no encontrado: ${dto.type}`,
      );

    // 5. Crear entidad con nombres en lugar de IDs
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

  async findAll(): Promise<ExerciseEntity[]> {
    return await this.exerciseRepository.find();
  }

  async findOne(id: string): Promise<ExerciseEntity> {
    const exercise = await this.exerciseRepository.findOne({ where: { id } });
    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${id} not found`);
    }
    return exercise;
  }

  async update(
    id: string,
    exerciseRequestDto: ExerciseRequestDto,
  ): Promise<ExerciseEntity> {
    const exercise = await this.findOne(id);
    const updatedExercise = this.exerciseRepository.merge(
      exercise,
      exerciseRequestDto,
    );

    const savedExercise = await this.exerciseRepository.save(updatedExercise);
    return savedExercise;
  }

  async remove(id: string): Promise<void> {
    const exercise = await this.findOne(id);
    await this.exerciseRepository.remove(exercise);
  }

  /**
   * 🎉 Sincroniza con ExerciseDB usando la API oficial GRATUITA
   *
   * ✅ Ventajas:
   * - Completamente gratuita
   * - No requiere API Key
   * - Más de 1300 ejercicios con imágenes, GIFs y videos
   * - Sin límites de requests
   *
   * 📚 Documentación: https://www.exercisedb.dev/docs
   * 🔗 Endpoint: https://www.exercisedb.dev/api/v1/exercises
   */
  async syncWithExerciseDB(): Promise<{ message: string; count: number }> {
    try {
      this.logger.log(
        '🚀 Iniciando sincronización con ExerciseDB (API oficial gratuita)...',
      );

      const baseUrl = 'https://www.exercisedb.dev/api/v1/exercises';

      this.logger.log('📡 Obteniendo ejercicios desde ExerciseDB...');

      // 🔄 Implementar paginación para obtener TODOS los ejercicios
      let allExercises: any[] = [];
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
        let batchData: any[];

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
          batch.map(async (item: any) => {
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

  /**
   * Busca ejercicios por nombre
   */
  async searchByName(name: string): Promise<ExerciseEntity[]> {
    return this.exerciseRepository
      .createQueryBuilder('exercise')
      .where('LOWER(exercise.name) LIKE LOWER(:name)', { name: `%${name}%` })
      .orderBy('exercise.name', 'ASC')
      .getMany();
  }

  /**
   * Mapea los datos de ExerciseDB v1 (API oficial gratuita) a la entidad local con traducción
   *
   * Estructura de datos de la API:
   * {
   *   "exerciseId": "K6NnTv0",
   *   "name": "Bench Press",
   *   "imageUrl": "Barbell-Bench-Press_Chest.png",
   *   "gifUrl": "https://...",
   *   "equipments": ["Barbell"],
   *   "bodyParts": ["Chest"],
   *   "exerciseType": "weight_reps",
   *   "targetMuscles": ["Pectoralis Major Clavicular Head"],
   *   "secondaryMuscles": ["Deltoid Anterior", ...],
   *   "videoUrl": "Barbell-Bench-Press_Chest_.mp4",
   *   "keywords": [...],
   *   "overview": "The Bench Press is a classic...",
   *   "instructions": [...]
   * }
   */
  private async mapToExerciseEntity(data: any): Promise<ExerciseEntity> {
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

  /**
   * Descarga y convierte la imagen/GIF a PNG
   */
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
   * Método de importación desde JSON local (mantenido por compatibilidad)
   */
  async importFromJson() {
    const data = fs.readFileSync('assets/exercises.json', 'utf8');
    const items = JSON.parse(data);

    const entities = await Promise.all(
      items.map(async (item: any) => {
        const e = new ExerciseEntity();
        e.id = item.exerciseId;
        e.name = this.capitalizeFirst(item.name);
        e.equipments = this.capitalizeArray(item.equipments);
        e.bodyParts = this.capitalizeArray(item.bodyParts);
        e.targetMuscles = this.capitalizeArray(item.targetMuscles);
        e.secondaryMuscles = this.capitalizeArray(item.secondaryMuscles);
        e.instructions = item.instructions;
        e.giftUrl = item.gifUrl;

        try {
          const gifResponse = await axios.get(item.gifUrl, {
            responseType: 'arraybuffer',
          });
          const pngBuffer = await sharp(gifResponse.data).png().toBuffer();
          e.imageUrl = pngBuffer.toString('base64');
        } catch (err) {
          e.imageUrl = undefined;
        }

        return e;
      }),
    );

    await this.exerciseRepository.save(entities, { chunk: 100 });
  }

  private capitalizeArray(arr: string[]): string[] {
    if (!Array.isArray(arr)) return arr;
    return arr.map(t => this.capitalizeFirst(t));
  }
}
