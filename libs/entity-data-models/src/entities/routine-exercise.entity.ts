import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ExerciseEntity } from './exercise.entity';
import { RoutineEntity } from './routine.entity';
import { SetEntity } from './set.entity';

@Entity()
export class RoutineExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ExerciseEntity, (exercise) => exercise.routineExercises, {
    eager: true,
  })
  exercise!: ExerciseEntity;

  @ManyToOne(() => RoutineEntity, (routine) => routine.routineExercises, {
    eager: true,
  })
  routine!: RoutineEntity;

  @ApiProperty({ type: () => SetEntity, isArray: true })
  @OneToMany(() => SetEntity, (set) => set.routineExercise, { cascade: true })
  sets!: SetEntity[];

  @ApiProperty({
    example: 'Notas específicas para este ejercicio en esta rutina',
    description: 'Notas específicas para el ejercicio en esta rutina',
  })
  @Column({ nullable: true })
  notes?: string;
}
