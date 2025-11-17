import { Body, Controller, Get, Post, Put, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import {
  LoginRequestDto,
  RegisterRequestDto,
  GoogleAuthRequestDto,
  RefreshTokenRequestDto,
  UpdateUserProfileDto,
  AuthResponseDto,
  UserResponseDto,
} from '@app/entity-data-models';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ==================== EMAIL/PASSWORD AUTH ====================

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() credentials: LoginRequestDto): Promise<AuthResponseDto> {
    return this.authService.login(credentials);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user with email and password' })
  async register(@Body() userData: RegisterRequestDto): Promise<AuthResponseDto> {
    return this.authService.register(userData);
  }

  // ==================== GOOGLE OAUTH ====================

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  async googleLogin() {
    // Passport redirects automatically to Google
    return;
  }

  @Post('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Body() googleData: GoogleAuthRequestDto): Promise<AuthResponseDto> {
    return this.authService.googleAuth(googleData);
  }

  // ==================== APPLE OAUTH ====================

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth flow' })
  async appleLogin() {
    // Passport redirects automatically to Apple
    return;
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  async appleCallback(@Req() req) {
    return this.authService.validateOAuthLogin(req.user, 'apple');
  }

  // ==================== TOKEN MANAGEMENT ====================

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  async logout(@CurrentUser() user: CurrentUserData): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Logout successful' };
  }

  // ==================== USER PROFILE ====================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@CurrentUser() user: CurrentUserData): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user.id);
  }

  @Put('users/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() updates: UpdateUserProfileDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<UserResponseDto> {
    // Ensure user can only update their own profile
    if (userId !== user.id) {
      throw new Error('Unauthorized: Cannot update another user\'s profile');
    }

    return this.authService.updateUserProfile(userId, updates);
  }
}
