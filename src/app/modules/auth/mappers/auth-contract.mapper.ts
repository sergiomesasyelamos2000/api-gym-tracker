import type { AuthResponse, UserResponse } from '@sergiomesasyelamos2000/shared';

const toIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
};

export const mapUserToAuthContract = (user: {
  id: string;
  email: string;
  name: string;
  picture?: string;
  googleId?: string;
  appleId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  picture: user.picture,
  googleId: user.googleId,
  appleId: user.appleId,
  createdAt: toIso(user.createdAt),
  updatedAt: toIso(user.updatedAt),
});

export const mapAuthResponseToContract = (response: {
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
    googleId?: string;
    appleId?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}): AuthResponse => ({
  user: mapUserToAuthContract(response.user),
  tokens: {
    accessToken: response.tokens.accessToken,
    refreshToken: response.tokens.refreshToken,
  },
});
