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
import { RoutineSessionEntity } from './routine-session.entity';

@Entity()
export class RoutineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'int', default: 0 })
  totalTime!: number; // en segundos

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
    routineExercise => routineExercise.routine,
    { cascade: true, onDelete: 'CASCADE' },
  )
  routineExercises!: RoutineExerciseEntity[];

  @OneToMany(() => RoutineSessionEntity, session => session.routine, {
    cascade: true,
  })
  sessions!: RoutineSessionEntity[];
}
