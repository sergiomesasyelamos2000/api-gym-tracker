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

// 🔥 Nueva interfaz para las notas con timestamp
export interface ExerciseNote {
  id: string;
  text: string;
  createdAt: string; // ISO string
}

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

  // 🔥 CAMBIO: De string a array de objetos JSON
  @ApiProperty({
    example: [
      {
        id: 'uuid-1',
        text: 'Primera nota del 10/10/2025',
        createdAt: '2025-10-10T10:00:00.000Z',
      },
      {
        id: 'uuid-2',
        text: 'Segunda nota del 11/10/2025',
        createdAt: '2025-10-11T14:30:00.000Z',
      },
    ],
    description: 'Array de notas con timestamp para el ejercicio',
  })
  @Column({ type: 'jsonb', nullable: true, default: [] })
  notes?: ExerciseNote[];

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

  @ApiProperty({
    example: 1,
    description: 'Orden del ejercicio en la rutina',
  })
  @Column({ type: 'int', default: 0 })
  order!: number;

  @ApiProperty({
    example: 'uuid-del-ejercicio-pareja',
    description: 'ID del ejercicio con el que forma superserie',
  })
  @Column({ type: 'varchar', nullable: true, default: null })
  supersetWith?: string | null;
}
