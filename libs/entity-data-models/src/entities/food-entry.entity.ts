import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity'; // ← CAMBIO: Referencia a UserEntity

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodUnit = 'gram' | 'ml' | 'portion' | 'custom';

@Entity('food_entries')
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
  date!: string;

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

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  calories!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  protein!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  carbs!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  fat!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  sugar?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  fiber?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  sodium?: number;

  @CreateDateColumn()
  createdAt!: Date;

  // ✅ CAMBIO: Relación directa con UserEntity
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user!: UserEntity;
}
