import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../subscription.service';
import { SUBSCRIPTION_FEATURE_KEY } from '../decorators/require-subscription.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the feature name from decorator metadata
    const feature = this.reflector.get<string>(
      SUBSCRIPTION_FEATURE_KEY,
      context.getHandler(),
    );

    // If no feature specified, allow access
    if (!feature) {
      return true;
    }

    // Resolve user id from JWT (preferred) or request payload.
    // Nutrition endpoints currently may run without JwtAuthGuard and pass userId in body/params.
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId =
      user?.sub ||
      user?.id ||
      request.body?.userId ||
      request.params?.userId ||
      request.query?.userId;

    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user has access to the feature
    const hasAccess = await this.subscriptionService.checkFeatureAccess(
      userId,
      feature,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `This feature requires a premium subscription. Feature: ${feature}`,
      );
    }

    return true;
  }
}
