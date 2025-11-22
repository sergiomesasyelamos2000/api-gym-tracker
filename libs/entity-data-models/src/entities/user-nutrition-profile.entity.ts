// user-nutrition-profile.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_nutrition_profiles')
export class UserNutritionProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  userId!: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  // Anthropometrics
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  height!: number;

  @Column()
  age!: number;

  @Column()
  gender!: string;

  @Column()
  activityLevel!: string;

  // Goals
  @Column()
  weightGoal!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  targetWeight!: number;

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  weeklyWeightChange!: number;

  // Macro Goals
  @Column()
  dailyCalories!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  proteinGrams!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  carbsGrams!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  fatGrams!: number;

  // Preferences
  @Column({ default: 'kg' })
  weightUnit!: string;

  @Column({ default: 'cm' })
  heightUnit!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
