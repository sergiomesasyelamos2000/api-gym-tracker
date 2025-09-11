import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RoutineExerciseEntity } from './routine-exercise.entity';

export enum WeightUnit {
  KG = 'kg',
  LBS = 'lbs',
}

export enum RepsType {
  REPS = 'reps',
  RANGE = 'range',
}

@Entity('sets')
export class SetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: 0,
    description: 'Índice que indica el orden del set en la rutina',
  })
  @Column()
  order!: number;

  @ApiProperty({
    example: 100,
    nullable: true,
    description: 'Peso levantado',
  })
  @Column({ type: 'float', nullable: true })
  weight?: number;

  @ApiProperty({
    example: 10,
    nullable: true,
    description: 'Número de repeticiones registradas en el set',
  })
  @Column({ type: 'int', nullable: true })
  reps?: number;

  @Column({ type: 'int', nullable: true })
  repsMin?: number;

  @Column({ type: 'int', nullable: true })
  repsMax?: number;

  @Column({ type: 'boolean', default: false })
  completed?: boolean;

  @Column({ type: 'varchar', default: 'kg' })
  weightUnit!: string;

  @Column({ type: 'varchar', default: 'reps' })
  repsType!: string;

  @ManyToOne(
    () => RoutineExerciseEntity,
    routineExercise => routineExercise.sets,
    { onDelete: 'CASCADE' },
  )
  routineExercise!: RoutineExerciseEntity;
}
