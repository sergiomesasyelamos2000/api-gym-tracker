import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserNutritionProfileEntity } from './user-nutrition-profile.entity';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodUnit = 'gram' | 'ml' | 'portion' | 'custom';

@Entity()
export class FoodEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  productCode!: string;

  @Column()
  productName!: string;

  @Column({ nullable: true })
  productImage?: string;

  @Column({ type: 'date' })
  date!: string; // YYYY-MM-DD

  @Column({ type: 'enum', enum: ['breakfast', 'lunch', 'dinner', 'snack'] })
  mealType!: MealType;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  quantity!: number;

  @Column({ type: 'enum', enum: ['gram', 'ml', 'portion', 'custom'] })
  unit!: FoodUnit;

  @Column({ nullable: true })
  customUnitName?: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  customUnitGrams?: number;

  // Nutritional values (calculated based on quantity)
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  calories!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  protein!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  carbs!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  fat!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => UserNutritionProfileEntity, profile => profile.foodEntries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  userProfile!: UserNutritionProfileEntity;
}
