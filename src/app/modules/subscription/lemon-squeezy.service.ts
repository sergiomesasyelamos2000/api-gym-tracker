import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

type LemonRelationship = {
  data?: { id?: string; type?: string };
};

type LemonWebhookEvent = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
    relationships?: Record<string, LemonRelationship>;
  };
};

@Injectable()
export class LemonSqueezyService {
  private readonly logger = new Logger(LemonSqueezyService.name);
  private readonly apiBaseUrl = 'https://api.lemonsqueezy.com/v1';

  constructor(private readonly configService: ConfigService) {}

  async createCheckoutSession(params: {
    variantId: string;
    userId: string;
    planId: string;
    email: string;
    name: string;
    successUrl: string;
  }): Promise<{ id: string; url: string }> {
    const storeId = this.getRequiredConfig('LEMON_SQUEEZY_STORE_ID');

    const payload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: params.email,
            name: params.name,
            custom: {
              userId: params.userId,
              planId: params.planId,
            },
          },
          checkout_options: {
            embed: false,
            media: true,
            logo: true,
          },
          product_options: {
            redirect_url: params.successUrl,
            receipt_button_text: 'Volver a la app',
            receipt_link_url: params.successUrl,
            enabled_variants: [Number(params.variantId)],
          },
          expires_at: null,
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: storeId,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: params.variantId,
            },
          },
        },
      },
    };

    const response = await this.request('/checkouts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const id = response?.data?.id;
    const url = response?.data?.attributes?.url;

    if (!id || !url) {
      this.logger.error(`Invalid checkout response: ${JSON.stringify(response)}`);
      throw new Error('Invalid checkout response from Lemon Squeezy');
    }

    this.logger.log(`Checkout created in Lemon Squeezy: ${id}`);
    return { id, url };
  }

  async getOrder(orderId: string): Promise<Record<string, unknown>> {
    const response = await this.request(`/orders/${orderId}?include=order-items`);
    return response?.data || {};
  }

  async getCheckout(checkoutId: string): Promise<Record<string, unknown>> {
    const response = await this.request(`/checkouts/${checkoutId}`);
    return response?.data || {};
  }

  async listOrders(
    pageNumber: number = 1,
    pageSize: number = 100,
  ): Promise<Array<Record<string, unknown>>> {
    const response = await this.request(
      `/orders?page[number]=${pageNumber}&page[size]=${pageSize}`,
    );
    return Array.isArray(response?.data) ? response.data : [];
  }

  async listOrdersByUserEmail(
    userEmail: string,
    pageNumber: number = 1,
    pageSize: number = 100,
  ): Promise<Array<Record<string, unknown>>> {
    const encodedEmail = encodeURIComponent(userEmail);
    const response = await this.request(
      `/orders?filter[user_email]=${encodedEmail}&page[number]=${pageNumber}&page[size]=${pageSize}`,
    );
    return Array.isArray(response?.data) ? response.data : [];
  }

  async listSubscriptionsByUserEmail(
    userEmail: string,
    status: string = 'active',
    pageNumber: number = 1,
    pageSize: number = 50,
  ): Promise<Array<Record<string, unknown>>> {
    const encodedEmail = encodeURIComponent(userEmail);
    const encodedStatus = encodeURIComponent(status);
    const response = await this.request(
      `/subscriptions?filter[user_email]=${encodedEmail}&filter[status]=${encodedStatus}&page[number]=${pageNumber}&page[size]=${pageSize}`,
    );
    return Array.isArray(response?.data) ? response.data : [];
  }

  async getSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
    const response = await this.request(`/subscriptions/${subscriptionId}`);
    return response?.data || {};
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.updateSubscriptionCancellation(subscriptionId, true);
  }

  async reactivateSubscription(subscriptionId: string): Promise<void> {
    await this.updateSubscriptionCancellation(subscriptionId, false);
  }

  async getSubscriptionPortalUrl(subscriptionId: string): Promise<string | undefined> {
    const subscription = await this.getSubscription(subscriptionId);
    const attributes = (subscription.attributes || {}) as Record<string, unknown>;
    const urls = (attributes.urls || {}) as Record<string, unknown>;

    const portalUrl = urls.customer_portal as string | undefined;
    const updateUrl = urls.update_payment_method as string | undefined;

    return portalUrl || updateUrl;
  }

  constructWebhookEvent(body: Buffer, signature: string): LemonWebhookEvent {
    const webhookSecret = this.getRequiredConfig('LEMON_SQUEEZY_WEBHOOK_SECRET');

    const digest = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (!this.safeCompareHex(digest, signature)) {
      throw new Error('Invalid webhook signature');
    }

    return JSON.parse(body.toString('utf8')) as LemonWebhookEvent;
  }

  private async updateSubscriptionCancellation(
    subscriptionId: string,
    cancelled: boolean,
  ): Promise<void> {
    await this.request(`/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            cancelled,
          },
        },
      }),
    });
  }

  private async request(
    path: string,
    init?: { method?: string; body?: string },
  ): Promise<Record<string, any>> {
    const apiKey = this.getRequiredConfig('LEMON_SQUEEZY_API_KEY');

    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method: init?.method || 'GET',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: init?.body,
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    if (!response.ok) {
      this.logger.error(
        `Lemon request failed (${response.status} ${response.statusText}): ${text}`,
      );
      throw new Error('Lemon Squeezy request failed');
    }

    return json;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is not configured`);
    }

    return value;
  }

  private safeCompareHex(left: string, right: string): boolean {
    try {
      const leftBuffer = Buffer.from(left, 'hex');
      const rightBuffer = Buffer.from(right, 'hex');

      if (leftBuffer.length !== rightBuffer.length) {
        return false;
      }

      return timingSafeEqual(leftBuffer, rightBuffer);
    } catch {
      return false;
    }
  }
}
