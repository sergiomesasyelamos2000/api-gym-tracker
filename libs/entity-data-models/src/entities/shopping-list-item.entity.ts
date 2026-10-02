import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FoodUnit } from '../dtos/shared-types';

@Entity('shopping_list_items')
@Index(['userId'])
export class ShoppingListItemEntity {
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

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  quantity!: number;

  @Column({ type: 'enum', enum: ['gram', 'ml', 'portion', 'custom'] })
  unit!: FoodUnit;

  @Column({ nullable: true })
  customUnitName?: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  customUnitGrams?: number;

  @Column({ type: 'boolean', default: false })
  purchased!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
