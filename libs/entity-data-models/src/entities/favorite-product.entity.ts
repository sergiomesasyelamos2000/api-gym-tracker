import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('favorite_products')
export class FavoriteProductEntity {
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
  calories!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  protein!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  carbs!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  fat!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
