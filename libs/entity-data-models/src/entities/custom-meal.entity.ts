import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface MealProduct {
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom?: boolean;
}

@Entity('custom_meals')
export class CustomMealEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ type: 'json' })
  products!: MealProduct[];

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  totalCalories!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  totalProtein!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  totalCarbs!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  totalFat!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
