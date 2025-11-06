import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('custom_products')
export class CustomProductEntity {
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

  @Column({ nullable: true })
  brand?: string;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  caloriesPer100!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  proteinPer100!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  carbsPer100!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  fatPer100!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  fiberPer100?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  sugarPer100?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  sodiumPer100?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  servingSize?: number;

  @Column({ nullable: true })
  servingUnit?: string;

  @Column({ nullable: true })
  barcode?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
