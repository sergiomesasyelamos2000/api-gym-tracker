import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoutineEntity } from './routine.entity';

@Entity()
@Index(['routine', 'createdAt'])
export class RoutineSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => RoutineEntity, routine => routine.sessions, {
    onDelete: 'CASCADE',
  })
  routine!: RoutineEntity;

  @Column('jsonb', { nullable: true, default: [] })
  exercises!: {
    exerciseId: string;
    name: string;
    sets: {
      weight: number;
      reps: number;
      completed: boolean;
      isRecord?: boolean;
    }[];
  }[];

  @Column({ type: 'int' })
  totalTime!: number; // en segundos

  @Column({ type: 'int' })
  totalWeight!: number;

  @Column({ type: 'int' })
  completedSets!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
