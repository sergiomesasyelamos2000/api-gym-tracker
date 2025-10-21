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

  @ManyToOne(() => ExerciseEntity, exercise => exercise.routineExercises, {
    eager: true,
  })
  exercise!: ExerciseEntity;

  @ManyToOne(() => RoutineEntity, routine => routine.routineExercises, {
    eager: true,
    onDelete: 'CASCADE',
  })
  routine!: RoutineEntity;

  @ApiProperty({ type: () => SetEntity, isArray: true })
  @OneToMany(() => SetEntity, set => set.routineExercise, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  sets!: SetEntity[];

  @ApiProperty({
    example: 'Notas específicas para este ejercicio en esta rutina',
    description: 'Notas específicas para el ejercicio en esta rutina',
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

  @Column({
    type: 'enum',
    enum: ['kg', 'lbs'],
    default: 'kg',
  })
  weightUnit: 'kg' | 'lbs';

  @Column({
    type: 'enum',
    enum: ['reps', 'range'],
    default: 'reps',
  })
  repsType: 'reps' | 'range';

  // 🔥 NUEVO: Campo para el orden
  @ApiProperty({
    example: 1,
    description: 'Orden del ejercicio en la rutina',
  })
  @Column({ type: 'int', default: 0 })
  order!: number;
}
