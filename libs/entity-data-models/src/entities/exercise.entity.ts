import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';
import { SetEntity } from './set.entity';
import { RoutineExerciseEntity } from './routine-exercise.entity';

@Entity()
export class ExerciseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: 0,
    description: 'Índice que indica el orden del ejercicio en la rutina',
  })
  @Column()
  order!: number;

  @ApiProperty({ example: 'My exercise title' })
  @Column()
  title!: string;

  @ApiProperty({
    example: '60',
    description:
      'El tiempo de descanso en segundos entre series del ejercicio.',
  })
  @Column({ nullable: true })
  restSeconds?: string;

  @ApiProperty({
    example: 'Focus on form. Go down to 90 degrees.',
    description: 'Notas de la rutina sobre el ejercicio',
  })
  @Column({ nullable: true })
  notes?: string;

  @ApiProperty({ example: '05293BCA' })
  @Column()
  exerciseTemplateId!: string;

  @ApiProperty({
    example: 0,
    nullable: true,
    description:
      'ID del superconjunto. Nulo significa que el ejercicio no forma parte de un superconjunto.',
  })
  @Column({ type: 'int', nullable: true })
  superSetsId?: number;

  /* @OneToMany(() => RoutineExerciseEntity, (routine) => routine.exercise, {
    cascade: true,
  })
  routineExercises!: RoutineExerciseEntity[]; */

  /*  @Column()
  sets?: SetEntity[]; */
}
