import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';
import { SetEntity, RoutineEntity, RoutineExerciseEntity } from './index';

@Entity()
export class ExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'My exercise title' })
  @Column()
  title!: string;

  @Column()
  muscularGroup!: string;

  @Column({ nullable: true })
  photoUrl?: string;

  @OneToMany(
    () => RoutineExerciseEntity,
    (routineExercise) => routineExercise.exercise,
  )
  routineExercises!: RoutineExerciseEntity[];
}
