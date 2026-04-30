import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionStatusResponseDto } from '@app/entity-data-models';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import {
  AppleServerNotificationDto,
  VerifyApplePurchaseDto,
} from './dto/apple-purchase.dto';

@ApiTags('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('verify-apple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify an Apple App Store purchase receipt' })
  async verifyApplePurchase(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: VerifyApplePurchaseDto,
  ): Promise<SubscriptionStatusResponseDto> {
    return this.subscriptionService.verifyApplePurchase(user.id, dto);
  }

  @Post('apple/notifications')
  @ApiOperation({ summary: 'Handle Apple App Store Server Notifications V2' })
  async handleAppleNotification(
    @Body() dto: AppleServerNotificationDto,
  ): Promise<{ received: boolean }> {
    await this.subscriptionService.handleAppleServerNotification(
      dto.signedPayload,
    );
    return { received: true };
  }
}
