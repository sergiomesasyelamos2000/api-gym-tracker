// ==================== REQUEST DTOs ====================

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
  name: string;
}

export interface GoogleAuthRequestDto {
  accessToken: string;
  userInfo: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ForgotPasswordResponseDto {
  message: string;
}

export interface ResetPasswordRequestDto {
  email: string;
  code: string;
  newPassword: string;
}

export interface UpdateUserProfileDto {
  email?: string;
  name?: string;
  picture?: string;
}

// ==================== RESPONSE DTOs ====================

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // In seconds
}

export interface AuthResponseDto {
  user: UserResponseDto;
  tokens: AuthTokensDto;
}
