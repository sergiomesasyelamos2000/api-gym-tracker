import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoutineExerciseEntity } from './routine-exercise.entity';

@Entity()
export class RoutineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  /* @OneToMany(() => RoutineExerciseEntity, (exercise) => exercise.routine, {
    cascade: true,
  })
  routineExercises!: RoutineExerciseEntity[]; */

  @CreateDateColumn()
  createdAt!: Date;
}
