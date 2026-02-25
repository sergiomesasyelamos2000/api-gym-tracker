import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  CreateCheckoutSessionRequestDto,
  VerifyPaymentRequestDto,
  CancelSubscriptionRequestDto,
  SubscriptionStatusResponseDto,
  CheckoutSessionResponseDto,
  SubscriptionResponseDto,
  CustomerPortalResponseDto,
} from '@app/entity-data-models';
import { SubscriptionService } from './subscription.service';
import { LemonSqueezyService } from './lemon-squeezy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private lemonSqueezyService: LemonSqueezyService,
  ) {}

  // ==================== USER ENDPOINTS ====================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription status' })
  async getMySubscription(
    @CurrentUser() user: CurrentUserData,
  ): Promise<SubscriptionStatusResponseDto> {
    return this.subscriptionService.getSubscriptionStatus(user.id);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Lemon Squeezy checkout session' })
  async createCheckoutSession(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCheckoutSessionRequestDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.subscriptionService.createCheckoutSession(
      user.id,
      user.email,
      user.name,
      dto,
    );
  }

  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment after checkout' })
  async verifyPayment(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: VerifyPaymentRequestDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.verifyPayment(dto.sessionId, user.id);
  }

  @Put('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CancelSubscriptionRequestDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.cancelSubscription(user.id, dto);
  }

  @Put('reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate canceled subscription' })
  async reactivateSubscription(
    @CurrentUser() user: CurrentUserData,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.reactivateSubscription(user.id);
  }

  @Get('customer-portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Lemon Squeezy customer portal URL' })
  async getCustomerPortal(
    @CurrentUser() user: CurrentUserData,
  ): Promise<CustomerPortalResponseDto> {
    return this.subscriptionService.getCustomerPortalUrl(user.id);
  }

  // ==================== WEBHOOK ENDPOINT ====================

  @Post('webhook')
  @ApiOperation({ summary: 'Lemon Squeezy webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing x-signature header');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      const event = this.lemonSqueezyService.constructWebhookEvent(
        req.rawBody,
        signature,
      );

      await this.subscriptionService.handleWebhookEvent(event);

      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook Error: ${error.message}`);
    }
  }
}
