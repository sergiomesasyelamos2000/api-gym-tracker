import { ExerciseEntity, ExerciseRequestDto } from '@app/entity-data-models';
import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { Repository } from 'typeorm';
import axios from 'axios';
const sharp = require('sharp');

@Injectable()
export class ExercisesService {
  private readonly base = 'https://exercisedb.p.rapidapi.com/exercises';

  private readonly headers = {
    'X-RapidAPI-Key': 'd4a42f5372msh2cda38dd85f24b9p1c4167jsn7d3366fa6d38',
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
  };
  constructor(
    @InjectRepository(ExerciseEntity)
    public exerciseRepository: Repository<ExerciseEntity>,
    private readonly httpService: HttpService,
  ) {
    setTimeout(() => {
      this.importFromJson();
    }, 500);
  }

  async create(
    exerciseRequestDto: ExerciseRequestDto,
  ): Promise<ExerciseEntity> {
    const newExercise = this.exerciseRepository.create(
      exerciseRequestDto as Partial<ExerciseEntity>,
    );
    return await this.exerciseRepository.save(newExercise);
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

  /* async syncAll() {
    const baseUrl = 'https://v2.exercisedb.dev/api/v1/exercises';
    let cursor: string | undefined = undefined;
    let hasNextPage = true;
    const allItems: any[] = [];

    while (hasNextPage) {
      const url = cursor ? `${baseUrl}?cursor=${cursor}` : baseUrl;
      const resp = await firstValueFrom(this.httpService.get(url));
      const items = resp.data.data as any[];
      allItems.push(...items);

      hasNextPage = resp.data.meta.hasNextPage;
      cursor = resp.data.meta.nextCursor;
    }

    const entities = allItems.map((item) => {
      const e = new ExerciseEntity();
      e.id = item.exerciseId;
      e.name = item.name;
      e.imageUrl = item.imageUrl;
      e.equipments = item.equipments;
      e.bodyParts = item.bodyParts;
      e.exerciseType = item.exerciseType;
      e.targetMuscles = item.targetMuscles;
      e.secondaryMuscles = item.secondaryMuscles;
      e.videoUrl = item.videoUrl;
      e.keywords = item.keywords;
      e.overview = item.overview;
      e.instructions = item.instructions ?? [];
      e.exerciseTips = item.exerciseTips;
      e.variations = item.variations;
      e.relatedExerciseIds = item.relatedExerciseIds;
      return e;
    });

    await this.exerciseRepository.save(entities, { chunk: 100 });
    return `Guardados ${entities.length} ejercicios`;
  } */

  private capitalizeFirst(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private capitalizeArray(arr: string[]): string[] {
    if (!Array.isArray(arr)) return arr;
    return arr.map(this.capitalizeFirst);
  }
}
