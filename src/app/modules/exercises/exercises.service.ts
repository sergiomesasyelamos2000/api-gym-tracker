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

const sharp = require('sharp');

@Injectable()
export class ExercisesService implements OnModuleInit {
  private readonly logger = new Logger(ExercisesService.name);
  private readonly baseUrl = 'https://v1.exercisedb.dev/api/v1';

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
  ) {}

  async onModuleInit() {
    //await this.syncWithExerciseDB();
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
    const { v4: uuidv4 } = await import('uuid'); // o usa crypto.randomUUID()

    const exercise = this.exerciseRepository.create({
      id: uuidv4(),
      name: dto.name,
      equipments: [dto.equipment],
      targetMuscles: [dto.primaryMuscle],
      secondaryMuscles: dto.otherMuscles || [],
      exerciseType: dto.type,
      instructions: [],
      bodyParts: [],
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
   * Sincroniza con ExerciseDB v1 (gratuito, sin API key requerida)
   */
  // exercises.service.ts - Método syncWithExerciseDB corregido
  async syncWithExerciseDB(): Promise<{ message: string; count: number }> {
    try {
      this.logger.log('Iniciando sincronización con ExerciseDB v1...');

      let allExercises: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const limit = 100; // Máximo permitido por la API

      // Obtener todas las páginas mediante paginación
      while (hasMorePages) {
        this.logger.log(`Obteniendo página ${currentPage}...`);

        const url = `${this.baseUrl}/exercises?offset=${(currentPage - 1) * limit}&limit=${limit}`;

        const response = await firstValueFrom(
          this.httpService.get(url, {
            headers: {
              'User-Agent': 'GymTrackerApp/1.0',
            },
          }),
        );

        if (response.status !== 200) {
          throw new Error(
            `Error HTTP ${response.status} al obtener página ${currentPage}`,
          );
        }

        const responseData = response.data;

        // Verificar la estructura de la respuesta
        if (!responseData.success) {
          throw new Error(
            `API returned success: false for page ${currentPage}`,
          );
        }

        if (!responseData.data || !Array.isArray(responseData.data)) {
          this.logger.error(
            `Estructura inesperada en página ${currentPage}:`,
            responseData,
          );
          throw new Error(
            `Estructura de datos inesperada en página ${currentPage}`,
          );
        }

        // Agregar los ejercicios de esta página
        allExercises = [...allExercises, ...responseData.data];
        this.logger.log(
          `Página ${currentPage}: obtenidos ${responseData.data.length} ejercicios. Total acumulado: ${allExercises.length}`,
        );

        // Verificar si hay más páginas
        if (responseData.metadata && responseData.metadata.nextPage) {
          currentPage++;

          // Opcional: pequeño delay para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          hasMorePages = false;
          this.logger.log(
            `No hay más páginas. Total de ejercicios obtenidos: ${allExercises.length}`,
          );
        }

        // Safety check: evitar bucles infinitos
        if (currentPage > 50) {
          // Máximo 50 páginas como seguridad
          this.logger.warn('Se alcanzó el límite de seguridad de 50 páginas');
          hasMorePages = false;
        }
      }

      if (allExercises.length === 0) {
        this.logger.warn('No se obtuvieron ejercicios de ExerciseDB');
        return {
          message: 'No se obtuvieron ejercicios de ExerciseDB',
          count: 0,
        };
      }

      this.logger.log(`Procesando ${allExercises.length} ejercicios...`);

      // Procesar en lotes para mejor performance
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
          `Procesado lote ${Math.floor(i / batchSize) + 1}: ${progress}/${allExercises.length} ejercicios`,
        );
      }

      // Limpiar la tabla antes de insertar nuevos datos (opcional)
      await this.exerciseRepository.createQueryBuilder().delete().execute();

      // Guardar todos los ejercicios
      await this.exerciseRepository.save(entities, { chunk: 100 });

      this.logger.log(
        `Sincronización completada: ${entities.length} ejercicios guardados en la base de datos`,
      );

      return {
        message: `Sincronización completada exitosamente. ${entities.length} ejercicios guardados.`,
        count: entities.length,
      };
    } catch (error) {
      this.logger.error(
        `Error en sincronización: ${error.message}`,
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
   * Mapea los datos de ExerciseDB v1 a la entidad local
   */
  private async mapToExerciseEntity(data: any): Promise<ExerciseEntity> {
    const { v4: uuidv4 } = await import('uuid');
    const entity = new ExerciseEntity();

    // ✅ SIEMPRE generar un nuevo UUID, ignorar los IDs de ExerciseDB
    entity.id = uuidv4();

    entity.name = this.capitalizeFirst(data.name);
    entity.giftUrl = data.gifUrl;
    entity.targetMuscles = this.capitalizeArray(data.targetMuscles || []);
    entity.bodyParts = this.capitalizeArray(data.bodyParts || []);
    entity.equipments = this.capitalizeArray(data.equipments || []);
    entity.secondaryMuscles = this.capitalizeArray(data.secondaryMuscles || []);
    entity.instructions = data.instructions || [];

    entity.exerciseType = data.exerciseType;
    entity.videoUrl = data.videoUrl;
    entity.keywords = data.keywords || [];
    entity.overview = data.overview;
    entity.exerciseTips = data.exerciseTips || [];
    entity.variations = data.variations || [];
    entity.relatedExerciseIds = data.relatedExerciseIds || [];

    if (data.gifUrl) {
      try {
        const imageBuffer = await this.downloadAndConvertImage(data.gifUrl);
        entity.imageUrl = imageBuffer.toString('base64');
      } catch (error) {
        this.logger.warn(
          `No se pudo procesar imagen para ${data.name}: ${error.message}`,
        );
        entity.imageUrl = undefined;
      }
    }

    return entity;
  }

  /**
   * Descarga y convierte la imagen GIF a PNG
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
    // Tu implementación existente...
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

  private capitalizeFirst(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private capitalizeArray(arr: string[]): string[] {
    if (!Array.isArray(arr)) return arr;
    return arr.map(this.capitalizeFirst);
  }
}
