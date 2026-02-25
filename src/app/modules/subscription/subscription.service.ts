import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
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
import { LemonSqueezyService } from './lemon-squeezy.service';
import { ConfigService } from '@nestjs/config';

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
    private lemonSqueezyService: LemonSqueezyService,
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
   * Creates a Lemon Squeezy checkout session
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    name: string,
    dto: CreateCheckoutSessionRequestDto,
  ): Promise<CheckoutSessionResponseDto> {
    this.logger.log(`Creating checkout session for user: ${userId}, plan: ${dto.planId}`);

    // Ensure subscription row exists
    await this.getOrCreateSubscription(userId);

    // Get variant ID based on plan
    const variantId = this.getVariantIdForPlan(dto.planId);

    // Create checkout session
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:8081';
    const successUrl = dto.successUrl || `${frontendUrl}/subscription/success`;
    const checkout = await this.lemonSqueezyService.createCheckoutSession({
      variantId,
      userId,
      planId: dto.planId,
      email,
      name,
      successUrl,
    });

    return {
      sessionId: checkout.id,
      checkoutUrl: checkout.url,
    };
  }

  /**
   * Verifies payment after checkout
   */
  async verifyPayment(
    sessionId: string,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Verifying payment for checkout/order: ${sessionId}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Attempt direct order verification first if caller provides order id.
    if (sessionId) {
      await this.trySyncFromOrder(sessionId, userId);
    }

    // Webhooks can arrive with delay; brief polling keeps app UX intact.
    const synced = await this.waitForPremiumSubscription(userId, 5, 2000);
    if (!synced) {
      throw new BadRequestException('Payment not completed yet');
    }

    const updated = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    if (!updated) {
      throw new NotFoundException('Subscription not found');
    }

    return this.mapToDto(updated);
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
      throw new BadRequestException('No active Lemon Squeezy subscription');
    }

    // Lemon Squeezy does not support an immediate hard-cancel mode in this flow.
    await this.lemonSqueezyService.cancelSubscription(
      subscription.stripeSubscriptionId,
    );

    subscription.cancelAtPeriodEnd = true;
    if (dto.cancelImmediately) {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
    }

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Subscription cancellation requested for user: ${userId}`);

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
      throw new BadRequestException('No Lemon Squeezy subscription to reactivate');
    }

    await this.lemonSqueezyService.reactivateSubscription(
      subscription.stripeSubscriptionId,
    );

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

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException('No Lemon Squeezy subscription found');
    }

    const portalUrl = await this.lemonSqueezyService.getSubscriptionPortalUrl(
      subscription.stripeSubscriptionId,
    );

    if (!portalUrl) {
      throw new NotFoundException('No customer portal URL available');
    }

    return {
      portalUrl,
    };
  }

  /**
   * Handles Lemon Squeezy webhook events
   */
  async handleWebhookEvent(event: any): Promise<void> {
    const eventName = event?.meta?.event_name || event?.event_name;
    this.logger.log(`Processing webhook event: ${eventName || 'unknown'}`);

    switch (eventName) {
      case 'order_created':
        await this.handleOrderCreated(event);
        break;

      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_unpaused':
        await this.handleLemonSubscriptionUpsert(event);
        break;

      case 'subscription_cancelled':
      case 'subscription_paused':
        await this.handleLemonSubscriptionCanceled(event);
        break;

      case 'subscription_expired':
        await this.handleLemonSubscriptionExpired(event);
        break;

      default:
        this.logger.log(`Unhandled event type: ${eventName || 'unknown'}`);
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

  private async trySyncFromOrder(
    sessionOrOrderId: string,
    userId: string,
  ): Promise<void> {
    try {
      const order = await this.lemonSqueezyService.getOrder(sessionOrOrderId);
      await this.applyOrderToSubscription(order, userId);
    } catch (error) {
      this.logger.debug(
        `Order sync skipped for ${sessionOrOrderId}: ${(error as Error).message}`,
      );
    }
  }

  private async waitForPremiumSubscription(
    userId: string,
    attempts: number,
    delayMs: number,
  ): Promise<boolean> {
    for (let i = 0; i < attempts; i += 1) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { userId },
      });

      if (subscription && this.isPremiumPlan(subscription.plan) && subscription.status === SubscriptionStatus.ACTIVE) {
        return true;
      }

      await this.sleep(delayMs);
    }

    return false;
  }

  private async handleOrderCreated(event: any): Promise<void> {
    const userId = this.extractUserId(event);
    const orderData = event?.data;

    if (!userId || !orderData) {
      this.logger.warn('Skipping order_created: missing userId or order data');
      return;
    }

    await this.applyOrderToSubscription(orderData, userId);
  }

  private async applyOrderToSubscription(
    orderData: any,
    userId: string,
  ): Promise<void> {
    const subscription = await this.getOrCreateSubscription(userId);

    const orderAttributes = (orderData.attributes || {}) as Record<string, any>;
    const paid = String(orderAttributes.status || '').toLowerCase() === 'paid';

    if (!paid) {
      this.logger.warn(`Order ${orderData.id} is not paid yet`);
      return;
    }

    const planFromCustomData = this.normalizePlan(
      this.extractPlanIdFromCustomData(orderAttributes),
    );

    const variantId = this.extractVariantId(orderAttributes);
    const planFromVariant = variantId ? this.mapVariantIdToPlan(variantId) : undefined;

    const plan = planFromCustomData || planFromVariant;
    if (!plan) {
      throw new BadRequestException('Unable to determine subscription plan from Lemon order');
    }

    subscription.plan = plan;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.currentPeriodStart = new Date();
    subscription.currency = String(orderAttributes.currency || 'usd').toLowerCase();
    subscription.price = Number(orderAttributes.total_usd || orderAttributes.subtotal_usd || 0);

    const lemonSubscriptionId = this.extractLemonSubscriptionId(orderAttributes);
    subscription.stripeSubscriptionId = lemonSubscriptionId;

    const customerId = orderAttributes.customer_id;
    if (customerId) {
      subscription.stripeCustomerId = String(customerId);
    }

    if (plan === SubscriptionPlan.LIFETIME) {
      subscription.currentPeriodEnd = undefined;
      subscription.cancelAtPeriodEnd = false;
      subscription.canceledAt = undefined;
    } else if (lemonSubscriptionId) {
      await this.syncSubscriptionPeriodFromLemon(subscription, lemonSubscriptionId);
    }

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Subscription synced from order ${orderData.id} for user: ${userId}`);
  }

  private async handleLemonSubscriptionUpsert(event: any): Promise<void> {
    const lemonSubscription = event?.data;
    const lemonSubscriptionId = lemonSubscription?.id;

    if (!lemonSubscriptionId) {
      this.logger.warn('Skipping subscription upsert event: missing subscription id');
      return;
    }

    let subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: String(lemonSubscriptionId) },
    });

    if (!subscription) {
      const userId = this.extractUserId(event);
      if (!userId) {
        this.logger.warn(
          `No local subscription found for Lemon subscription ${lemonSubscriptionId} and userId missing in webhook`,
        );
        return;
      }

      subscription = await this.getOrCreateSubscription(userId);
      subscription.stripeSubscriptionId = String(lemonSubscriptionId);
    }

    const attributes = (lemonSubscription.attributes || {}) as Record<string, any>;
    const status = String(attributes.status || '').toLowerCase();

    const planFromCustomData = this.normalizePlan(this.extractPlanId(event));
    subscription.plan = planFromCustomData || subscription.plan || SubscriptionPlan.MONTHLY;
    subscription.status = this.mapLemonStatus(status);
    subscription.cancelAtPeriodEnd = Boolean(attributes.cancelled);

    const createdAt = this.parseDate(attributes.created_at);
    const renewsAt = this.parseDate(attributes.renews_at);

    if (createdAt) {
      subscription.currentPeriodStart = createdAt;
    }

    if (renewsAt) {
      subscription.currentPeriodEnd = renewsAt;
    }

    if (subscription.cancelAtPeriodEnd) {
      subscription.canceledAt = this.parseDate(attributes.ends_at) || new Date();
    } else {
      subscription.canceledAt = undefined;
    }

    await this.subscriptionRepository.save(subscription);
    this.logger.log(`Subscription updated for Lemon subscription: ${lemonSubscriptionId}`);
  }

  private async handleLemonSubscriptionCanceled(event: any): Promise<void> {
    const lemonSubscriptionId = event?.data?.id;

    if (!lemonSubscriptionId) {
      this.logger.warn('Skipping canceled webhook: missing subscription id');
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: String(lemonSubscriptionId) },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for Lemon subscription: ${lemonSubscriptionId}`);
      return;
    }

    subscription.status = SubscriptionStatus.CANCELED;
    subscription.cancelAtPeriodEnd = true;
    subscription.canceledAt = new Date();

    await this.subscriptionRepository.save(subscription);
  }

  private async handleLemonSubscriptionExpired(event: any): Promise<void> {
    const lemonSubscriptionId = event?.data?.id;

    if (!lemonSubscriptionId) {
      this.logger.warn('Skipping expired webhook: missing subscription id');
      return;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: String(lemonSubscriptionId) },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for Lemon subscription: ${lemonSubscriptionId}`);
      return;
    }

    subscription.status = SubscriptionStatus.EXPIRED;
    subscription.plan = SubscriptionPlan.FREE;
    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = new Date();

    await this.subscriptionRepository.save(subscription);
  }

  private getVariantIdForPlan(plan: SubscriptionPlan): string {
    switch (plan) {
      case SubscriptionPlan.MONTHLY:
        return this.getRequiredVariantConfig('LEMON_SQUEEZY_MONTHLY_VARIANT_ID');
      case SubscriptionPlan.YEARLY:
        return this.getRequiredVariantConfig('LEMON_SQUEEZY_YEARLY_VARIANT_ID');
      case SubscriptionPlan.LIFETIME:
        return this.getRequiredVariantConfig('LEMON_SQUEEZY_LIFETIME_VARIANT_ID');
      default:
        throw new BadRequestException('Invalid plan');
    }
  }

  private getRequiredVariantConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new BadRequestException(`${key} is not configured`);
    }

    return value;
  }

  private mapVariantIdToPlan(variantId: string): SubscriptionPlan | undefined {
    const normalized = String(variantId);

    if (normalized === this.configService.get<string>('LEMON_SQUEEZY_MONTHLY_VARIANT_ID')) {
      return SubscriptionPlan.MONTHLY;
    }

    if (normalized === this.configService.get<string>('LEMON_SQUEEZY_YEARLY_VARIANT_ID')) {
      return SubscriptionPlan.YEARLY;
    }

    if (normalized === this.configService.get<string>('LEMON_SQUEEZY_LIFETIME_VARIANT_ID')) {
      return SubscriptionPlan.LIFETIME;
    }

    return undefined;
  }

  private mapLemonStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'on_trial':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'cancelled':
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'past_due':
      case 'paused':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'incomplete':
        return SubscriptionStatus.INCOMPLETE;
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

  private async syncSubscriptionPeriodFromLemon(
    subscription: SubscriptionEntity,
    lemonSubscriptionId: string,
  ): Promise<void> {
    try {
      const remoteSubscription = await this.lemonSqueezyService.getSubscription(
        lemonSubscriptionId,
      );
      const attributes = (remoteSubscription.attributes || {}) as Record<string, any>;

      const currentPeriodStart =
        this.parseDate(attributes.created_at) || new Date();
      const currentPeriodEnd = this.parseDate(attributes.renews_at);

      subscription.currentPeriodStart = currentPeriodStart;
      subscription.currentPeriodEnd = currentPeriodEnd;
      subscription.status = this.mapLemonStatus(
        String(attributes.status || 'active').toLowerCase(),
      );
      subscription.cancelAtPeriodEnd = Boolean(attributes.cancelled);
    } catch (error) {
      this.logger.warn(
        `Unable to sync period from Lemon subscription ${lemonSubscriptionId}: ${(error as Error).message}`,
      );
      subscription.currentPeriodStart = new Date();
    }
  }

  private extractUserId(event: any): string | undefined {
    const customData = event?.meta?.custom_data || event?.data?.attributes?.custom_data || {};
    const userId = customData.userId || customData.user_id;
    return userId ? String(userId) : undefined;
  }

  private extractPlanId(event: any): string | undefined {
    const customData = event?.meta?.custom_data || event?.data?.attributes?.custom_data || {};
    const planId = customData.planId || customData.plan_id;
    return planId ? String(planId) : undefined;
  }

  private extractPlanIdFromCustomData(orderAttributes: Record<string, any>): string | undefined {
    const customData = orderAttributes.custom_data || orderAttributes.checkout_data?.custom || {};
    const planId = customData.planId || customData.plan_id;
    return planId ? String(planId) : undefined;
  }

  private normalizePlan(value?: string): SubscriptionPlan | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.toLowerCase();
    switch (normalized) {
      case SubscriptionPlan.MONTHLY:
        return SubscriptionPlan.MONTHLY;
      case SubscriptionPlan.YEARLY:
        return SubscriptionPlan.YEARLY;
      case SubscriptionPlan.LIFETIME:
        return SubscriptionPlan.LIFETIME;
      case SubscriptionPlan.FREE:
        return SubscriptionPlan.FREE;
      default:
        return undefined;
    }
  }

  private extractVariantId(orderAttributes: Record<string, any>): string | undefined {
    const firstOrderItem = orderAttributes.first_order_item || {};
    const variantId = firstOrderItem.variant_id || firstOrderItem.variantId;
    return variantId ? String(variantId) : undefined;
  }

  private extractLemonSubscriptionId(orderAttributes: Record<string, any>): string | undefined {
    const firstOrderItem = orderAttributes.first_order_item || {};
    const subscriptionId =
      firstOrderItem.subscription_id ||
      firstOrderItem.subscriptionId ||
      orderAttributes.subscription_id ||
      orderAttributes.subscriptionId;

    return subscriptionId ? String(subscriptionId) : undefined;
  }

  private parseDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
