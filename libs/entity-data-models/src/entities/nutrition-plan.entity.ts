import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  NutritionPlanDataDto,
  NutritionPlanMacroSnapshotDto,
} from '../dtos/nutrition-plan.dto';
import { NutritionPlanStatus } from '../dtos/shared-types';

@Entity('nutrition_plans')
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
export class NutritionPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  })
  status!: NutritionPlanStatus;

  @Column({ type: 'int' })
  durationDays!: number;

  @Column({ type: 'json' })
  planData!: NutritionPlanDataDto;

  @Column({ type: 'json', nullable: true })
  macroSnapshot?: NutritionPlanMacroSnapshotDto | null;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  avgDailyCalories!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  avgDailyProtein!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  avgDailyCarbs!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  avgDailyFat!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
