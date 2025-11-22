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
import { WeightUnit } from './set.entity';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type Gender = 'male' | 'female' | 'other';
export type WeightGoal = 'lose' | 'maintain' | 'gain';
export type HeightUnit = 'cm' | 'ft';

@Entity('user_nutrition_profiles')
export class UserNutritionProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  userId!: string;

  // ✅ Relación OneToOne con UserEntity
  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user!: UserEntity;

  // Anthropometrics
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  height!: number;

  @Column({ type: 'int' })
  age!: number;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'] })
  gender!: Gender;

  @Column({
    type: 'enum',
    enum: [
      'sedentary',
      'lightly_active',
      'moderately_active',
      'very_active',
      'extra_active',
    ],
  })
  activityLevel!: ActivityLevel;

  // Goals
  @Column({ type: 'enum', enum: ['lose', 'maintain', 'gain'] })
  weightGoal!: WeightGoal;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  targetWeight!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  weeklyWeightChange!: number;

  // Macro Goals
  @Column({ type: 'int' })
  dailyCalories!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  proteinGrams!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  carbsGrams!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  fatGrams!: number;

  // Preferences
  @Column({ type: 'enum', enum: ['kg', 'lbs'], default: 'kg' })
  weightUnit!: WeightUnit;

  @Column({ type: 'enum', enum: ['cm', 'ft'], default: 'cm' })
  heightUnit!: HeightUnit;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
