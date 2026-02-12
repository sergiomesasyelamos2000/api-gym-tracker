// Export shared types first (enums, interfaces without decorators)
export * from './shared-types';

// Export frontend-compatible types (interfaces without class-validator decorators)
// These will be used by React Native app and have priority over class-based DTOs
export * from './frontend-types';

// Export all DTOs (some with class-validator decorators for backend use)
export * from './auth.dto';
export * from './exercise.model';
export * from './routine.model';
export * from './set.model';
export * from './routine-session.model';
export * from './shopping-list.dto';
export * from './favorite-product.dto';
export * from './custom-product.dto';
export * from './custom-meal.dto';
export * from './external-api.model';

// These DTOs exist in both frontend-types.ts (interfaces) and individual files (classes with decorators)
// To avoid duplicate export errors, we comment these out
// Backend controllers import directly from the specific files when needed (e.g., './google-auth.dto')
// Frontend uses the interfaces from frontend-types.ts
// export * from './google-auth.dto';
// export * from './nutrition.model';
// export * from './chat.dto';
export * from './recognition.dto';
// export * from './subscription.dto';
