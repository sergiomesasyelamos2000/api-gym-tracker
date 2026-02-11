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

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user has access to the feature
    const hasAccess = await this.subscriptionService.checkFeatureAccess(
      user.sub,
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
