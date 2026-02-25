import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  SubscriptionEntity,
  RoutineEntity,
  CustomProductEntity,
  CustomMealEntity,
} from '@app/entity-data-models';
import { SubscriptionService } from './subscription.service';
import { LemonSqueezyService } from './lemon-squeezy.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionGuard } from './guards/subscription.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionEntity,
      RoutineEntity,
      CustomProductEntity,
      CustomMealEntity,
    ]),
    ConfigModule,
    AuthModule, // For JwtAuthGuard and CurrentUser decorator
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, LemonSqueezyService, SubscriptionGuard],
  exports: [SubscriptionService, SubscriptionGuard], // Export to use in other modules
})
export class SubscriptionModule {}
