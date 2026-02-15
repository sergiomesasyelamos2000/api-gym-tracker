import {
  GoogleAuthRequestDto,
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
  UpdateUserProfileDto,
} from '@app/entity-data-models';
import type { GoogleLoginDto } from '@app/entity-data-models/dtos/frontend-types';
import type { AuthResponse, UserResponse } from '@sergiomesasyelamos2000/shared';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  CurrentUserData,
} from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  mapAuthResponseToContract,
  mapUserToAuthContract,
} from './mappers/auth-contract.mapper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() credentials: LoginRequestDto): Promise<AuthResponse> {
    const response = await this.authService.login(credentials);
    return mapAuthResponseToContract(response);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user with email and password' })
  async register(@Body() userData: RegisterRequestDto): Promise<AuthResponse> {
    const response = await this.authService.register(userData);
    return mapAuthResponseToContract(response);
  }

  @Post('google/login')
  async googleLogin(@Body() body: GoogleLoginDto): Promise<AuthResponse> {
    const response = await this.authService.googleLogin(body.idToken);
    return mapAuthResponseToContract(response);
  }

  @Post('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Body() googleData: GoogleAuthRequestDto,
  ): Promise<AuthResponse> {
    const response = await this.authService.googleAuth(googleData);
    return mapAuthResponseToContract(response);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth flow' })
  async appleLogin() {
    return;
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  async appleCallback(@Req() req) {
    return this.authService.validateOAuthLogin(req.user, 'apple');
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refreshToken(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<AuthResponse> {
    const response = await this.authService.refreshToken(dto);
    return mapAuthResponseToContract(response);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset token' })
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with verification code' })
  async resetPassword(
    @Body() dto: ResetPasswordRequestDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successful' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  async logout(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Logout successful' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserResponse> {
    const currentUser = await this.authService.getCurrentUser(user.id);
    return mapUserToAuthContract(currentUser);
  }

  @Put('users/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() updates: UpdateUserProfileDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserResponse> {
    if (userId !== user.id) {
      throw new Error("Unauthorized: Cannot update another user's profile");
    }

    const updatedUser = await this.authService.updateUserProfile(userId, updates);
    return mapUserToAuthContract(updatedUser);
  }
}
