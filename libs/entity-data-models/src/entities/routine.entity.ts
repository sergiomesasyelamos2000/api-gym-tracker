import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { RoutineExerciseEntity } from './routine-exercise.entity';
import { ExerciseEntity } from './exercise.entity';
import { RoutineSessionEntity } from './routine-session.entity';
import { UserEntity } from './user.entity';

@Entity()
@Index(['userId', 'createdAt'])
@Index(['userId', 'sortOrder'])
export class RoutineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'int', default: 0 })
  totalTime!: number; // en segundos

  /** Lower values appear first in the user's routine list. */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column()
  @Index()
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user!: UserEntity;

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
