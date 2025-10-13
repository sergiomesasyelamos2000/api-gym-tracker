import { Body, Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ---- GOOGLE ----
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    return; // Passport redirige automáticamente a Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Body() body: { accessToken: string; userInfo: any }) {
    // 1. Verificar el accessToken de Google con la API de Google
    // 2. Buscar o crear el usuario en tu base de datos
    // 3. Generar y devolver tu JWT propio
    console.log('Google callback body:', body);

    return this.authService.validateGoogleAccessToken(
      body.accessToken,
      body.userInfo,
    );
  }

  // ---- APPLE ----
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleLogin() {
    return;
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleCallback(@Req() req) {
    return this.authService.validateOAuthLogin(req.user, 'apple');
  }
}
