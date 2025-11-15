import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto, LoginDto, AuthResponseDto } from '@app/entity-data-models';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ---- LOCAL AUTH ----
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'User successfully logged in', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  async login(@Req() req): Promise<AuthResponseDto> {
    return this.authService.login(req.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return user;
  }

  // ---- GOOGLE ----
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleLogin() {
    return; // Passport redirige automáticamente a Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req) {
    return this.authService.validateOAuthLogin(req.user, 'google');
  }

  @Post('google/token')
  @ApiOperation({ summary: 'Login with Google access token (for mobile apps)' })
  @ApiResponse({ status: 200, description: 'User successfully logged in', type: AuthResponseDto })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        userInfo: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            picture: { type: 'string' }
          }
        }
      }
    }
  })
  async googleToken(@Body() body: { accessToken: string; userInfo: any }): Promise<AuthResponseDto> {
    return this.authService.validateGoogleAccessToken(
      body.accessToken,
      body.userInfo,
    );
  }

  // ---- APPLE ----
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  async appleLogin() {
    return;
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  async appleCallback(@Req() req) {
    return this.authService.validateOAuthLogin(req.user, 'apple');
  }
}
