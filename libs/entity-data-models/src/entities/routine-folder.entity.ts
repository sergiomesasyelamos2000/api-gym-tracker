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
import { UserEntity } from './user.entity';
import { RoutineEntity } from './routine.entity';

@Entity()
@Index(['userId', 'sortOrder'])
export class RoutineFolderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  /** Position among root list items (folders + root routines share this space). */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user!: UserEntity;

  @OneToMany(() => RoutineEntity, routine => routine.folder)
  routines!: RoutineEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
