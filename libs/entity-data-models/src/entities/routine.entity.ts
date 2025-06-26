import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { RoutineExerciseEntity } from './routine-exercise.entity';
import { ExerciseEntity } from './exercise.entity';

@Entity()
export class RoutineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  totalTime!: number;

  @Column()
  totalWeight!: number;

  @Column()
  completedSets!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(
    () => RoutineExerciseEntity,
    (routineExercise) => routineExercise.routine,
  )
  routineExercises!: RoutineExerciseEntity[];
}
