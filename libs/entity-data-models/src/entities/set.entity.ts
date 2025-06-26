import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ExerciseEntity } from './exercise.entity';
import { RoutineExerciseEntity } from './routine-exercise.entity';

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

  @ManyToOne(
    () => RoutineExerciseEntity,
    (routineExercise) => routineExercise.sets,
  )
  routineExercise!: RoutineExerciseEntity;
}
