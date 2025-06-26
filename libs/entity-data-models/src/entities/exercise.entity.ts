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

  @ApiProperty({
    example: 'Focus on form. Go down to 90 degrees.',
    description: 'Notas de la rutina sobre el ejercicio',
  })
  @Column({ nullable: true })
  notes?: string;

  @ApiProperty({
    example: '60',
    description:
      'El tiempo de descanso en segundos entre series del ejercicio.',
  })
  @Column({ nullable: true })
  restSeconds?: string;

  @OneToMany(
    () => RoutineExerciseEntity,
    (routineExercise) => routineExercise.exercise,
  )
  routineExercises!: RoutineExerciseEntity[];
}
