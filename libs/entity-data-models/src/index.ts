// Export shared types first to establish them as canonical
export * from './dtos/shared-types';

// Export frontend types
export type {
  GoogleLoginDto,
  GoogleAuthResponseDto,
  UserAnthropometricsDto,
  UserGoalsDto,
  UserMacroGoalsDto,
  UserPreferencesDto,
  CreateUserNutritionProfileDto,
  UpdateUserNutritionProfileDto,
  UpdateMacroGoalsDto,
  UserNutritionProfileResponseDto,
  CreateFoodEntryDto,
  UpdateFoodEntryDto,
  FoodEntryResponseDto,
  DailyNutritionSummaryDto,
  BarcodeScanDto,
  ChatMessageDto,
  ChatRequestDto,
  ChatResponseDto,
  UserContext,
  RecognizeImageDto,
  RecognizedProduct,
  RecognitionResponseDto,
  CreateCheckoutSessionRequestDto,
  VerifyPaymentRequestDto,
  CancelSubscriptionRequestDto,
  SubscriptionResponseDto,
  SubscriptionFeaturesDto,
  SubscriptionStatusResponseDto,
  CheckoutSessionResponseDto,
  CustomerPortalResponseDto,
  RoutineSessionEntity as RoutineSessionInterface,
} from './dtos/frontend-types';

// Export other DTOs
export * from './dtos/auth.dto';
export * from './dtos/exercise.model';
export * from './dtos/routine.model';
export * from './dtos/set.model';
export * from './dtos/routine-session.model';
export * from './dtos/shopping-list.dto';
export * from './dtos/favorite-product.dto';
export * from './dtos/custom-product.dto';
export * from './dtos/custom-meal.dto';
export * from './dtos/external-api.model';
export * from './dtos/recognition.dto';

// Export entity classes (not the duplicate type exports)
export { UserEntity } from './entities/user.entity';
export { ExerciseEntity } from './entities/exercise.entity';
export { RoutineEntity } from './entities/routine.entity';
export { SetEntity } from './entities/set.entity';
export { RoutineExerciseEntity } from './entities/routine-exercise.entity';
export { RoutineSessionEntity } from './entities/routine-session.entity';
export { EquipmentEntity } from './entities/equipment.entity';
export { MuscleEntity } from './entities/muscle.entity';
export { ExerciseTypeEntity } from './entities/exercise-type.entity';
export { UserNutritionProfileEntity } from './entities/user-nutrition-profile.entity';
export { FoodEntryEntity } from './entities/food-entry.entity';
export { ShoppingListItemEntity } from './entities/shopping-list-item.entity';
export { FavoriteProductEntity } from './entities/favorite-product.entity';
export { CustomProductEntity } from './entities/custom-product.entity';
export { CustomMealEntity } from './entities/custom-meal.entity';
export { SubscriptionEntity } from './entities/subscription.entity';
