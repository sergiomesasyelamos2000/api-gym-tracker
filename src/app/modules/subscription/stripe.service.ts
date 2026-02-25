import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
    });
  }

  /**
   * Creates a Stripe checkout session for subscription purchase
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    metadata: Record<string, string>,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    this.logger.log(
      `Creating checkout session for customer: ${customerId}, price: ${priceId}`,
    );

    const isLifetime = priceId.includes('lifetime');

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isLifetime ? 'payment' : 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    };

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    this.logger.log(`Checkout session created: ${session.id}`);
    return session;
  }

  /**
   * Creates a Stripe customer
   */
  async createCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    this.logger.log(`Creating Stripe customer for email: ${email}`);

    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata,
    });

    this.logger.log(`Customer created: ${customer.id}`);
    return customer;
  }

  /**
   * Cancels a subscription in Stripe
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
  ): Promise<Stripe.Subscription> {
    this.logger.log(
      `Canceling subscription: ${subscriptionId}, immediately: ${immediately}`,
    );

    if (immediately) {
      // Cancel immediately
      return await this.stripe.subscriptions.cancel(subscriptionId);
    } else {
      // Cancel at period end
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  /**
   * Reactivates a canceled subscription
   */
  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    this.logger.log(`Reactivating subscription: ${subscriptionId}`);

    return await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Gets a subscription from Stripe
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.logger.log(`Retrieving subscription: ${subscriptionId}`);
    return await this.stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });
  }

  /**
   * Validates and constructs a webhook event
   */
  constructWebhookEvent(
    body: Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a customer portal session for managing subscription
   */
  async createCustomerPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    this.logger.log(
      `Creating customer portal session for customer: ${customerId}`,
    );

    return await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Retrieves a checkout session with line items
   */
  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription', 'customer'],
    });
  }
}
