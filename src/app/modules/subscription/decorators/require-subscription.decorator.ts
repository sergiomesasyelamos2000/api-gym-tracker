import { SetMetadata } from '@nestjs/common';

export const SUBSCRIPTION_FEATURE_KEY = 'subscriptionFeature';

/**
 * Decorator to mark routes that require subscription feature access
 * @param feature - The feature name to check (e.g., 'create_routine', 'ai_analysis')
 */
export const RequireSubscription = (feature: string) =>
  SetMetadata(SUBSCRIPTION_FEATURE_KEY, feature);
