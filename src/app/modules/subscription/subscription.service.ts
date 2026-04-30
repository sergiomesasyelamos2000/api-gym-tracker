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
import { VerifyApplePurchaseDto } from './dto/apple-purchase.dto';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  AutoRenewStatus,
  Environment,
  NotificationTypeV2,
  SignedDataVerifier,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library';

interface AppleVerifyReceiptTransaction {
  product_id?: string;
  original_transaction_id?: string;
  transaction_id?: string;
  purchase_date_ms?: string;
  expires_date_ms?: string;
  cancellation_date_ms?: string;
}

interface AppleVerifyReceiptRenewalInfo {
  product_id?: string;
  original_transaction_id?: string;
  auto_renew_status?: string;
}

interface AppleVerifyReceiptResponse {
  status: number;
  environment?: string;
  latest_receipt_info?: AppleVerifyReceiptTransaction[];
  pending_renewal_info?: AppleVerifyReceiptRenewalInfo[];
  receipt?: {
    in_app?: AppleVerifyReceiptTransaction[];
  };
}

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
      subscription.stripeCustomerId!,
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
      let stripeSubscription: any;

      if (typeof session.subscription === 'string') {
        // Si es un ID, obtener el objeto completo de Stripe
        this.logger.log(`Fetching subscription details for: ${session.subscription}`);
        stripeSubscription = await this.stripeService.getSubscription(session.subscription);
      } else if (session.subscription && typeof session.subscription === 'object') {
        stripeSubscription = session.subscription;
      } else {
        throw new BadRequestException('Subscription information missing from session');
      }

      // Buscar las fechas del período - pueden estar en diferentes lugares según la versión de la API
      let periodStart = stripeSubscription.current_period_start;
      let periodEnd = stripeSubscription.current_period_end;

      // Si no están en el objeto principal, buscar en los items (API version 2026-01-28.clover)
      if (!periodStart || !periodEnd) {
        const firstItem = stripeSubscription.items?.data?.[0];
        if (firstItem) {
          periodStart = firstItem.current_period_start;
          periodEnd = firstItem.current_period_end;
          this.logger.log(`Using period dates from subscription item: start=${periodStart}, end=${periodEnd}`);
        }
      }

      if (!periodStart || !periodEnd) {
        this.logger.error(`Missing period dates in subscription: ${JSON.stringify(stripeSubscription)}`);
        throw new BadRequestException('Invalid subscription data from Stripe');
      }

      subscription.plan = planId;
      subscription.status = this.mapStripeStatus(stripeSubscription.status);
      subscription.stripeSubscriptionId = stripeSubscription.id;

      // Convertir timestamps de Unix a Date objects
      subscription.currentPeriodStart = new Date(periodStart * 1000);
      subscription.currentPeriodEnd = new Date(periodEnd * 1000);

      // Validar que las fechas son válidas
      if (isNaN(subscription.currentPeriodStart.getTime()) || isNaN(subscription.currentPeriodEnd.getTime())) {
        this.logger.error(`Invalid dates - periodStart: ${periodStart}, periodEnd: ${periodEnd}`);
        throw new BadRequestException('Invalid subscription period dates');
      }

      subscription.price = (stripeSubscription.items?.data?.[0]?.price?.unit_amount ?? 0) / 100;
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

  async verifyApplePurchase(
    userId: string,
    dto: VerifyApplePurchaseDto,
  ): Promise<SubscriptionStatusResponseDto> {
    const verifyResponse = await this.verifyAppleReceipt(dto.receiptData);
    const candidate = this.selectAppleReceiptTransaction(
      verifyResponse,
      dto.productId,
    );

    if (!candidate) {
      throw new BadRequestException(
        'No se encontro ninguna compra valida de Apple para los productos configurados',
      );
    }

    const productId = candidate.product_id;
    const plan = this.getPlanFromAppleProductId(productId);

    if (!plan) {
      throw new BadRequestException(
        `Producto Apple no reconocido: ${productId || 'desconocido'}`,
      );
    }

    const renewalInfo = this.selectRenewalInfo(
      verifyResponse,
      candidate.original_transaction_id,
      productId,
    );

    await this.applyAppleEntitlement(userId, plan, candidate, renewalInfo);
    return this.getSubscriptionStatus(userId);
  }

  async handleAppleServerNotification(signedPayload: string): Promise<void> {
    const verifier = this.getAppleSignedDataVerifier();
    const notification =
      await verifier.verifyAndDecodeNotification(signedPayload);

    const signedTransactionInfo = notification.data?.signedTransactionInfo;
    const signedRenewalInfo = notification.data?.signedRenewalInfo;

    const transaction = signedTransactionInfo
      ? await verifier.verifyAndDecodeTransaction(signedTransactionInfo)
      : null;
    const renewalInfo = signedRenewalInfo
      ? await verifier.verifyAndDecodeRenewalInfo(signedRenewalInfo)
      : null;

    const subscription = await this.findSubscriptionByAppleTransaction(
      transaction,
      renewalInfo,
    );

    if (!subscription) {
      this.logger.warn(
        `Apple notification ignored: no subscription found for original transaction ${transaction?.originalTransactionId || renewalInfo?.originalTransactionId || 'unknown'}`,
      );
      return;
    }

    switch (notification.notificationType) {
      case NotificationTypeV2.SUBSCRIBED:
      case NotificationTypeV2.DID_RENEW:
      case NotificationTypeV2.OFFER_REDEEMED:
      case NotificationTypeV2.RENEWAL_EXTENDED:
      case NotificationTypeV2.REFUND_REVERSED:
      case NotificationTypeV2.ONE_TIME_CHARGE:
        if (transaction) {
          const plan = this.getPlanFromAppleProductId(transaction.productId);
          if (plan) {
            await this.applyAppleEntitlement(
              subscription.userId,
              plan,
              this.mapDecodedTransactionToReceiptTransaction(transaction),
              renewalInfo
                ? this.mapDecodedRenewalInfoToReceiptRenewalInfo(renewalInfo)
                : undefined,
            );
          }
        }
        break;

      case NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS:
        subscription.cancelAtPeriodEnd =
          renewalInfo?.autoRenewStatus === AutoRenewStatus.OFF;
        await this.subscriptionRepository.save(subscription);
        break;

      case NotificationTypeV2.DID_FAIL_TO_RENEW:
        subscription.status = SubscriptionStatus.PAST_DUE;
        await this.subscriptionRepository.save(subscription);
        break;

      case NotificationTypeV2.GRACE_PERIOD_EXPIRED:
      case NotificationTypeV2.EXPIRED:
      case NotificationTypeV2.REFUND:
      case NotificationTypeV2.REVOKE:
        await this.revokeAppleSubscription(subscription);
        break;

      default:
        this.logger.log(
          `Apple notification type not handled explicitly: ${notification.notificationType}`,
        );
        break;
    }
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
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
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
    session: any,
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
    stripeSubscription: any,
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for Stripe subscription: ${stripeSubscription.id}`);
      return;
    }

    // Buscar las fechas del período - pueden estar en diferentes lugares según la versión de la API
    let periodStart = stripeSubscription.current_period_start;
    let periodEnd = stripeSubscription.current_period_end;

    // Si no están en el objeto principal, buscar en los items
    if (!periodStart || !periodEnd) {
      const firstItem = stripeSubscription.items?.data?.[0];
      if (firstItem) {
        periodStart = firstItem.current_period_start;
        periodEnd = firstItem.current_period_end;
      }
    }

    subscription.status = this.mapStripeStatus(stripeSubscription.status);
    if (periodStart && periodEnd) {
      subscription.currentPeriodStart = new Date(periodStart * 1000);
      subscription.currentPeriodEnd = new Date(periodEnd * 1000);
    }
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

    await this.subscriptionRepository.save(subscription);
    this.logger.log(`Subscription updated for Stripe subscription: ${stripeSubscription.id}`);
  }

  private async handleSubscriptionDeleted(
    stripeSubscription: any,
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
    invoice: any,
  ): Promise<void> {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    // Subscription will be updated via subscription.updated event
  }

  private async handleInvoicePaymentFailed(
    invoice: any,
  ): Promise<void> {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);
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

  private async verifyAppleReceipt(
    receiptData: string,
  ): Promise<AppleVerifyReceiptResponse> {
    const sharedSecret =
      this.configService.get<string>('APPLE_SHARED_SECRET') || '';

    if (!sharedSecret) {
      throw new BadRequestException(
        'APPLE_SHARED_SECRET no esta configurado en el backend',
      );
    }

    const payload = {
      'receipt-data': receiptData,
      password: sharedSecret,
      'exclude-old-transactions': false,
    };

    const productionResponse = await this.postVerifyReceipt(
      'https://buy.itunes.apple.com/verifyReceipt',
      payload,
    );

    if (productionResponse.status === 21007) {
      return this.postVerifyReceipt(
        'https://sandbox.itunes.apple.com/verifyReceipt',
        payload,
      );
    }

    if (productionResponse.status !== 0) {
      throw new BadRequestException(
        `Apple verifyReceipt fallo con status ${productionResponse.status}`,
      );
    }

    return productionResponse;
  }

  private async postVerifyReceipt(
    url: string,
    payload: Record<string, unknown>,
  ): Promise<AppleVerifyReceiptResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new BadRequestException(
        `No se pudo validar el recibo de Apple (${response.status})`,
      );
    }

    return (await response.json()) as AppleVerifyReceiptResponse;
  }

  private selectAppleReceiptTransaction(
    verifyResponse: AppleVerifyReceiptResponse,
    requestedProductId?: string,
  ): AppleVerifyReceiptTransaction | null {
    const knownProductIds = Object.values(this.getAppleProductIdMap()).filter(
      Boolean,
    ) as string[];
    const transactions = [
      ...(verifyResponse.latest_receipt_info || []),
      ...(verifyResponse.receipt?.in_app || []),
    ].filter((transaction) =>
      requestedProductId
        ? transaction.product_id === requestedProductId
        : knownProductIds.includes(transaction.product_id || ''),
    );

    if (transactions.length === 0) {
      return null;
    }

    return transactions.sort((left, right) => {
      const leftSortKey = Number(
        left.expires_date_ms || left.purchase_date_ms || 0,
      );
      const rightSortKey = Number(
        right.expires_date_ms || right.purchase_date_ms || 0,
      );

      return rightSortKey - leftSortKey;
    })[0];
  }

  private selectRenewalInfo(
    verifyResponse: AppleVerifyReceiptResponse,
    originalTransactionId?: string,
    productId?: string,
  ): AppleVerifyReceiptRenewalInfo | undefined {
    return verifyResponse.pending_renewal_info?.find(
      (renewal) =>
        renewal.original_transaction_id === originalTransactionId ||
        renewal.product_id === productId,
    );
  }

  private async applyAppleEntitlement(
    userId: string,
    plan: SubscriptionPlan,
    transaction: AppleVerifyReceiptTransaction,
    renewalInfo?: AppleVerifyReceiptRenewalInfo,
  ): Promise<void> {
    const subscription = await this.getOrCreateSubscription(userId);
    const now = Date.now();
    const purchaseDateMs = Number(transaction.purchase_date_ms || now);
    const expiresDateMs = Number(transaction.expires_date_ms || 0);
    const isLifetime = plan === SubscriptionPlan.LIFETIME;
    const isCanceled =
      renewalInfo?.auto_renew_status === String(AutoRenewStatus.OFF);
    const isRefunded = Boolean(transaction.cancellation_date_ms);

    subscription.billingProvider = 'apple';
    subscription.appleProductId = transaction.product_id;
    subscription.appleOriginalTransactionId =
      transaction.original_transaction_id || subscription.appleOriginalTransactionId;
    subscription.appleTransactionId =
      transaction.transaction_id || subscription.appleTransactionId;
    subscription.plan = isRefunded ? SubscriptionPlan.FREE : plan;
    subscription.status = isRefunded
      ? SubscriptionStatus.EXPIRED
      : isLifetime
        ? SubscriptionStatus.ACTIVE
        : expiresDateMs > now
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.EXPIRED;
    subscription.currentPeriodStart = new Date(purchaseDateMs);
    subscription.currentPeriodEnd =
      !isLifetime && expiresDateMs ? new Date(expiresDateMs) : undefined;
    subscription.cancelAtPeriodEnd = !isLifetime && isCanceled;
    subscription.canceledAt =
      !isLifetime && isCanceled ? new Date() : undefined;
    subscription.price = this.getDefaultPriceForPlan(plan);
    subscription.currency = 'eur';

    await this.subscriptionRepository.save(subscription);
  }

  private async revokeAppleSubscription(
    subscription: SubscriptionEntity,
  ): Promise<void> {
    subscription.plan = SubscriptionPlan.FREE;
    subscription.status = SubscriptionStatus.EXPIRED;
    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = new Date();
    subscription.currentPeriodEnd = new Date();
    await this.subscriptionRepository.save(subscription);
  }

  private async findSubscriptionByAppleTransaction(
    transaction: JWSTransactionDecodedPayload | null,
    renewalInfo: JWSRenewalInfoDecodedPayload | null,
  ): Promise<SubscriptionEntity | null> {
    const originalTransactionId =
      transaction?.originalTransactionId || renewalInfo?.originalTransactionId;
    const transactionId = transaction?.transactionId;
    const appAccountToken = transaction?.appAccountToken;

    return this.subscriptionRepository.findOne({
      where: [
        ...(originalTransactionId
          ? [{ appleOriginalTransactionId: originalTransactionId }]
          : []),
        ...(transactionId ? [{ appleTransactionId: transactionId }] : []),
        ...(appAccountToken ? [{ userId: appAccountToken }] : []),
      ],
    });
  }

  private mapDecodedTransactionToReceiptTransaction(
    transaction: JWSTransactionDecodedPayload,
  ): AppleVerifyReceiptTransaction {
    return {
      product_id: transaction.productId,
      original_transaction_id: transaction.originalTransactionId,
      transaction_id: transaction.transactionId,
      purchase_date_ms: transaction.purchaseDate?.toString(),
      expires_date_ms: transaction.expiresDate?.toString(),
      cancellation_date_ms: transaction.revocationDate?.toString(),
    };
  }

  private mapDecodedRenewalInfoToReceiptRenewalInfo(
    renewalInfo: JWSRenewalInfoDecodedPayload,
  ): AppleVerifyReceiptRenewalInfo {
    return {
      original_transaction_id: renewalInfo.originalTransactionId,
      product_id: renewalInfo.productId,
      auto_renew_status:
        renewalInfo.autoRenewStatus !== undefined
          ? String(renewalInfo.autoRenewStatus)
          : undefined,
    };
  }

  private getAppleProductIdMap(): Record<SubscriptionPlan, string | undefined> {
    return {
      [SubscriptionPlan.FREE]: undefined,
      [SubscriptionPlan.MONTHLY]: this.configService.get<string>(
        'APPLE_IAP_MONTHLY_PRODUCT_ID',
      ),
      [SubscriptionPlan.YEARLY]: this.configService.get<string>(
        'APPLE_IAP_YEARLY_PRODUCT_ID',
      ),
      [SubscriptionPlan.LIFETIME]: this.configService.get<string>(
        'APPLE_IAP_LIFETIME_PRODUCT_ID',
      ),
    };
  }

  private getPlanFromAppleProductId(
    productId?: string,
  ): SubscriptionPlan | null {
    if (!productId) {
      return null;
    }

    const productMap = this.getAppleProductIdMap();
    const entry = Object.entries(productMap).find(
      ([plan, configuredProductId]) =>
        plan !== SubscriptionPlan.FREE && configuredProductId === productId,
    );

    return (entry?.[0] as SubscriptionPlan | undefined) || null;
  }

  private getDefaultPriceForPlan(plan: SubscriptionPlan): number {
    switch (plan) {
      case SubscriptionPlan.MONTHLY:
        return 0.99;
      case SubscriptionPlan.YEARLY:
        return 9.99;
      case SubscriptionPlan.LIFETIME:
        return 19.99;
      default:
        return 0;
    }
  }

  private getAppleSignedDataVerifier(): SignedDataVerifier {
    const bundleId =
      this.configService.get<string>('APPLE_BUNDLE_ID') ||
      this.configService.get<string>('APPLE_CLIENT_ID_IOS') ||
      '';
    const certificatePaths = (
      this.configService.get<string>('APPLE_ROOT_CA_PATHS') || ''
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!bundleId) {
      throw new BadRequestException(
        'APPLE_BUNDLE_ID o APPLE_CLIENT_ID_IOS debe estar configurado',
      );
    }

    if (certificatePaths.length === 0) {
      throw new BadRequestException(
        'APPLE_ROOT_CA_PATHS debe apuntar a los certificados raiz de Apple para verificar notificaciones',
      );
    }

    const certificates = certificatePaths.map((filePath) =>
      readFileSync(resolve(process.cwd(), filePath)),
    );
    const environment =
      (this.configService.get<string>('APPLE_SERVER_ENVIRONMENT') || 'Sandbox')
        .toLowerCase() === 'production'
        ? Environment.PRODUCTION
        : Environment.SANDBOX;
    const appAppleIdValue =
      this.configService.get<string>('APPLE_APP_STORE_APPLE_ID') || '';
    const appAppleId = appAppleIdValue ? Number(appAppleIdValue) : undefined;

    return new SignedDataVerifier(
      certificates,
      true,
      environment,
      bundleId,
      appAppleId,
    );
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
    stripeStatus: string,
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
