import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionResponseDto,
  SubscriptionStatusResponseDto,
  SubscriptionFeaturesDto,
  CreateCheckoutSessionRequestDto,
  CheckoutSessionResponseDto,
  CancelSubscriptionRequestDto,
  CustomerPortalResponseDto,
  RoutineEntity,
  CustomProductEntity,
  CustomMealEntity,
} from '@app/entity-data-models';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(RoutineEntity)
    private routineRepository: Repository<RoutineEntity>,
    @InjectRepository(CustomProductEntity)
    private customProductRepository: Repository<CustomProductEntity>,
    @InjectRepository(CustomMealEntity)
    private customMealRepository: Repository<CustomMealEntity>,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {}

  /**
   * Gets or creates a subscription for a user
   */
  async getOrCreateSubscription(
    userId: string,
  ): Promise<SubscriptionEntity> {
    let subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    if (!subscription) {
      this.logger.log(`Creating free subscription for user: ${userId}`);
      subscription = this.subscriptionRepository.create({
        userId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        price: 0,
        currency: 'usd',
      });
      await this.subscriptionRepository.save(subscription);
    }

    return subscription;
  }

  /**
   * Creates a Stripe checkout session
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    name: string,
    dto: CreateCheckoutSessionRequestDto,
  ): Promise<CheckoutSessionResponseDto> {
    this.logger.log(`Creating checkout session for user: ${userId}, plan: ${dto.planId}`);

    // Get or create subscription record
    let subscription = await this.getOrCreateSubscription(userId);

    // Create or retrieve Stripe customer
    if (!subscription.stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(email, name, {
        userId,
      });
      subscription.stripeCustomerId = customer.id;
      await this.subscriptionRepository.save(subscription);
    }

    // Get price ID based on plan
    const priceId = this.getPriceIdForPlan(dto.planId);

    // Create checkout session
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:8081';
    const successUrl = dto.successUrl || `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = dto.cancelUrl || `${frontendUrl}/subscription/cancel`;

    const session = await this.stripeService.createCheckoutSession(
      subscription.stripeCustomerId,
      priceId,
      {
        userId,
        planId: dto.planId,
      },
      successUrl,
      cancelUrl,
    );

    return {
      sessionId: session.id,
      checkoutUrl: session.url || '',
    };
  }

  /**
   * Verifies payment after checkout
   */
  async verifyPayment(
    sessionId: string,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Verifying payment for session: ${sessionId}`);

    const session = await this.stripeService.getCheckoutSession(sessionId);

    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Payment not completed');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Update subscription based on session metadata
    const planId = session.metadata?.planId as SubscriptionPlan;
    if (!planId) {
      throw new BadRequestException('Plan information missing from session');
    }

    const isLifetime = planId === SubscriptionPlan.LIFETIME;

    if (isLifetime) {
      // Lifetime: no subscription ID, no end date
      subscription.plan = SubscriptionPlan.LIFETIME;
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.stripeSubscriptionId = undefined;
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = undefined;
      subscription.price = (session.amount_total || 0) / 100; // Convert from cents
    } else {
      // Recurring subscription
      const stripeSubscription = session.subscription as Stripe.Subscription;
      subscription.plan = planId;
      subscription.status = this.mapStripeStatus(stripeSubscription.status);
      subscription.stripeSubscriptionId = stripeSubscription.id;
      // @ts-ignore - Stripe API version typing issue
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      // @ts-ignore - Stripe API version typing issue
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      // @ts-ignore - Stripe API version typing issue
      subscription.price = (stripeSubscription.items.data[0]?.price?.unit_amount ?? 0) / 100;
    }

    subscription.currency = session.currency || 'usd';
    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Subscription updated for user: ${userId}, plan: ${subscription.plan}`);

    return this.mapToDto(subscription);
  }

  /**
   * Gets subscription status with features
   */
  async getSubscriptionStatus(
    userId: string,
  ): Promise<SubscriptionStatusResponseDto> {
    const subscription = await this.getOrCreateSubscription(userId);
    const features = this.getFeaturesByPlan(subscription.plan);
    const isPremium = this.isPremiumPlan(subscription.plan);

    let daysRemaining: number | undefined;
    if (subscription.currentPeriodEnd && subscription.plan !== SubscriptionPlan.LIFETIME) {
      const now = new Date();
      const endDate = new Date(subscription.currentPeriodEnd);
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      subscription: this.mapToDto(subscription),
      features,
      isPremium,
      daysRemaining,
    };
  }

  /**
   * Cancels a subscription
   */
  async cancelSubscription(
    userId: string,
    dto: CancelSubscriptionRequestDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Canceling subscription for user: ${userId}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('Cannot cancel free subscription');
    }

    if (subscription.plan === SubscriptionPlan.LIFETIME) {
      throw new BadRequestException('Cannot cancel lifetime subscription');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException('No active Stripe subscription');
    }

    // Cancel in Stripe
    await this.stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      dto.cancelImmediately || false,
    );

    // Update local subscription
    if (dto.cancelImmediately) {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Subscription canceled for user: ${userId}`);

    return this.mapToDto(subscription);
  }

  /**
   * Reactivates a canceled subscription
   */
  async reactivateSubscription(
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Reactivating subscription for user: ${userId}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not set to cancel');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException('No Stripe subscription to reactivate');
    }

    // Reactivate in Stripe
    await this.stripeService.reactivateSubscription(
      subscription.stripeSubscriptionId,
    );

    // Update local subscription
    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = undefined;
    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Subscription reactivated for user: ${userId}`);

    return this.mapToDto(subscription);
  }

  /**
   * Gets customer portal URL
   */
  async getCustomerPortalUrl(
    userId: string,
  ): Promise<CustomerPortalResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new NotFoundException('No Stripe customer found');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:8081';
    const returnUrl = `${frontendUrl}/subscription/status`;

    const session = await this.stripeService.createCustomerPortalSession(
      subscription.stripeCustomerId,
      returnUrl,
    );

    return {
      portalUrl: session.url,
    };
  }

  /**
   * Handles Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Checks if user has access to a feature
   */
  async checkFeatureAccess(
    userId: string,
    feature: string,
  ): Promise<boolean> {
    const subscription = await this.getOrCreateSubscription(userId);
    const features = this.getFeaturesByPlan(subscription.plan);

    switch (feature) {
      case 'create_routine': {
        if (features.maxRoutines === null) return true; // Unlimited
        const count = await this.countUserRoutines(userId);
        return count < features.maxRoutines;
      }

      case 'create_custom_product': {
        if (features.maxCustomProducts === null) return true;
        const count = await this.countUserCustomProducts(userId);
        return count < features.maxCustomProducts;
      }

      case 'create_custom_meal': {
        if (features.maxCustomMeals === null) return true;
        const count = await this.countUserCustomMeals(userId);
        return count < features.maxCustomMeals;
      }

      case 'ai_analysis':
        return features.aiAnalysisEnabled;

      case 'advanced_stats':
        return features.advancedStatsEnabled;

      case 'export_data':
        return features.exportDataEnabled;

      default:
        return false;
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.warn('No userId in checkout session metadata');
      return;
    }

    // Payment will be verified via verifyPayment endpoint
    this.logger.log(`Checkout completed for user: ${userId}`);
  }

  private async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for Stripe subscription: ${stripeSubscription.id}`);
      return;
    }

    subscription.status = this.mapStripeStatus(stripeSubscription.status);
    // @ts-ignore - Stripe API version typing issue
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    // @ts-ignore - Stripe API version typing issue
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    // @ts-ignore - Stripe API version typing issue
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

    await this.subscriptionRepository.save(subscription);
    this.logger.log(`Subscription updated for Stripe subscription: ${stripeSubscription.id}`);
  }

  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for Stripe subscription: ${stripeSubscription.id}`);
      return;
    }

    subscription.status = SubscriptionStatus.EXPIRED;
    subscription.plan = SubscriptionPlan.FREE;
    subscription.canceledAt = new Date();

    await this.subscriptionRepository.save(subscription);
    this.logger.log(`Subscription deleted for Stripe subscription: ${stripeSubscription.id}`);
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    // Subscription will be updated via subscription.updated event
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);
    // @ts-ignore - Stripe typing issue with subscription field
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

    if (subscriptionId) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { stripeSubscriptionId: subscriptionId },
      });

      if (subscription) {
        subscription.status = SubscriptionStatus.PAST_DUE;
        await this.subscriptionRepository.save(subscription);
      }
    }
  }

  private getPriceIdForPlan(plan: SubscriptionPlan): string {
    switch (plan) {
      case SubscriptionPlan.MONTHLY:
        return this.configService.get<string>('STRIPE_MONTHLY_PRICE_ID') || '';
      case SubscriptionPlan.YEARLY:
        return this.configService.get<string>('STRIPE_YEARLY_PRICE_ID') || '';
      case SubscriptionPlan.LIFETIME:
        return this.configService.get<string>('STRIPE_LIFETIME_PRICE_ID') || '';
      default:
        throw new BadRequestException('Invalid plan');
    }
  }

  private mapStripeStatus(
    stripeStatus: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE;
      case 'trialing':
        return SubscriptionStatus.TRIAL;
      default:
        return SubscriptionStatus.EXPIRED;
    }
  }

  private getFeaturesByPlan(plan: SubscriptionPlan): SubscriptionFeaturesDto {
    switch (plan) {
      case SubscriptionPlan.FREE:
        return {
          maxRoutines: 3,
          maxCustomProducts: 5,
          maxCustomMeals: 3,
          aiAnalysisEnabled: false,
          advancedStatsEnabled: false,
          exportDataEnabled: false,
          prioritySupportEnabled: false,
        };

      case SubscriptionPlan.MONTHLY:
      case SubscriptionPlan.YEARLY:
      case SubscriptionPlan.LIFETIME:
        return {
          maxRoutines: null, // Unlimited
          maxCustomProducts: null,
          maxCustomMeals: null,
          aiAnalysisEnabled: true,
          advancedStatsEnabled: true,
          exportDataEnabled: true,
          prioritySupportEnabled: true,
        };

      default:
        return this.getFeaturesByPlan(SubscriptionPlan.FREE);
    }
  }

  private isPremiumPlan(plan: SubscriptionPlan): boolean {
    return [
      SubscriptionPlan.MONTHLY,
      SubscriptionPlan.YEARLY,
      SubscriptionPlan.LIFETIME,
    ].includes(plan);
  }

  private async countUserRoutines(userId: string): Promise<number> {
    return await this.routineRepository.count({ where: { userId } });
  }

  private async countUserCustomProducts(userId: string): Promise<number> {
    return await this.customProductRepository.count({ where: { userId } });
  }

  private async countUserCustomMeals(userId: string): Promise<number> {
    return await this.customMealRepository.count({ where: { userId } });
  }

  private mapToDto(
    subscription: SubscriptionEntity,
  ): SubscriptionResponseDto {
    return {
      id: subscription.id,
      userId: subscription.userId,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      trialEnd: subscription.trialEnd,
      price: subscription.price,
      currency: subscription.currency,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}
