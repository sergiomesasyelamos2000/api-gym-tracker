import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum SubscriptionPlan {
  FREE = 'free',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  TRIAL = 'trial',
}

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  @Index()
  userId!: string;

  // ✅ Relación OneToOne con UserEntity
  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user!: UserEntity;

  // Stripe identifiers
  @Column({ nullable: true })
  @Index()
  stripeCustomerId?: string;

  @Column({ nullable: true })
  stripeSubscriptionId?: string; // null para lifetime

  // Subscription details
  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan!: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  @Index()
  status!: SubscriptionStatus;

  // Billing period
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  currentPeriodStart!: Date;

  @Column({ type: 'timestamp', nullable: true }) // null para lifetime
  currentPeriodEnd?: Date;

  // Cancellation
  @Column({ default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt?: Date;

  // Trial
  @Column({ type: 'timestamp', nullable: true })
  trialEnd?: Date;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'varchar', length: 3, default: 'usd' })
  currency!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
