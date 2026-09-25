import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoutineExerciseEntity } from './routine-exercise.entity';
import { RoutineSessionEntity } from './routine-session.entity';
import { UserEntity } from './user.entity';
import { RoutineFolderEntity } from './routine-folder.entity';

@Entity()
@Index(['userId', 'createdAt'])
@Index(['userId', 'sortOrder'])
@Index(['userId', 'folderId', 'sortOrder'])
export class RoutineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'int', default: 0 })
  totalTime!: number; // en segundos

  /**
   * Lower values appear first.
   * Root routines share sortOrder space with folders; nested routines
   * use sortOrder only within their folder.
   */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'uuid', nullable: true })
  folderId!: string | null;

  @ManyToOne(() => RoutineFolderEntity, folder => folder.routines, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'folderId' })
  folder!: RoutineFolderEntity | null;

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
