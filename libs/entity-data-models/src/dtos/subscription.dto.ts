import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from './shared-types';

// Request DTOs
export class CreateCheckoutSessionRequestDto {
  @IsEnum(SubscriptionPlan)
  planId!: SubscriptionPlan;

  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @IsOptional()
  @IsUrl()
  cancelUrl?: string;
}

export class VerifyPaymentRequestDto {
  @IsString()
  sessionId!: string;

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  planId?: SubscriptionPlan;
}

export class CancelSubscriptionRequestDto {
  @IsOptional()
  @IsBoolean()
  cancelImmediately?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

// Response DTOs
export class SubscriptionResponseDto {
  id!: string;
  userId!: string;
  lemonCustomerId?: string;
  lemonSubscriptionId?: string;
  plan!: SubscriptionPlan;
  status!: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd!: boolean;
  canceledAt?: Date;
  trialEnd?: Date;
  price!: number;
  currency!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class SubscriptionFeaturesDto {
  maxRoutines!: number | null; // null = unlimited
  maxCustomProducts!: number | null;
  maxCustomMeals!: number | null;
  aiAnalysisEnabled!: boolean;
  advancedStatsEnabled!: boolean;
  exportDataEnabled!: boolean;
  prioritySupportEnabled!: boolean;
}

export class SubscriptionStatusResponseDto {
  subscription!: SubscriptionResponseDto;
  features!: SubscriptionFeaturesDto;
  isPremium!: boolean;
  daysRemaining?: number; // null for lifetime, undefined for free
}

export class CheckoutSessionResponseDto {
  sessionId!: string;
  checkoutUrl!: string;
}

export class CustomerPortalResponseDto {
  portalUrl!: string;
}
