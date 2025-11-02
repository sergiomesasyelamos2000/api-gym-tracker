import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Body,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  // Ruta para iniciar el login con Google (usado por web)
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req: Request) {
    // Guard redirects
  }

  // Callback de Google OAuth (usado por web)
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateGoogleUser(req.user);
    const tokens = await this.authService.login(user);

    // Redirigir al frontend con el token
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/auth/callback?token=${tokens.access_token}`);
  }

  // Ruta para login desde mobile (Expo)
  @Post('google/mobile')
  async googleAuthMobile(@Body() body: { idToken: string }) {
    try {
      // Verificar el token de Google
      const googleResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${body.idToken}`,
      );

      if (!googleResponse.ok) {
        return {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Invalid Google token',
        };
      }

      const googleProfile = await googleResponse.json();

      // Validar o crear usuario
      const user = await this.authService.validateGoogleUser({
        email: googleProfile.email,
        firstName: googleProfile.given_name,
        lastName: googleProfile.family_name,
        picture: googleProfile.picture,
        googleId: googleProfile.sub,
      });

      // Generar JWT
      const tokens = await this.authService.login(user);

      return {
        statusCode: HttpStatus.OK,
        data: tokens,
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
      };
    }
  }

  // 👇 NUEVO: Endpoint para iniciar OAuth desde mobile
  @Get('google/mobile-init')
  googleAuthMobileInit(@Res() res: Response) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    // 👇 Reemplaza con tu URL de ngrok
    const redirectUri = `https://9ff5246b145d.ngrok-free.app/api/auth/google/mobile-callback`;

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=openid%20profile%20email` +
      `&access_type=offline`;

    res.redirect(authUrl);
  }

  // 👇 NUEVO: Callback de OAuth para mobile
  @Get('google/mobile-callback')
  async googleAuthMobileCallback(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        return res.redirect(`app://auth?error=no_code`);
      }

      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'GOOGLE_CLIENT_SECRET',
      );
      // 👇 Reemplaza con tu URL de ngrok
      const redirectUri = `https://9ff5246b145d.ngrok-free.app/api/auth/google/mobile-callback`;

      // Intercambiar el código por tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Error obteniendo tokens de Google:', tokenData);
        return res.redirect(`app://auth?error=token_exchange_failed`);
      }

      const { id_token } = tokenData;

      // Verificar el token con Google
      const googleResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`,
      );
      const googleProfile = await googleResponse.json();

      if (!googleResponse.ok) {
        console.error('Error verificando token de Google:', googleProfile);
        return res.redirect(`app://auth?error=invalid_token`);
      }

      // Crear/obtener usuario
      const user = await this.authService.validateGoogleUser({
        email: googleProfile.email,
        firstName: googleProfile.given_name,
        lastName: googleProfile.family_name,
        picture: googleProfile.picture,
        googleId: googleProfile.sub,
      });

      // Generar JWT
      const tokens = await this.authService.login(user);

      // Redirigir a un deep link de tu app con el token
      res.redirect(`app://auth?token=${tokens.access_token}`);
    } catch (error) {
      console.error('Error en OAuth callback:', error);
      res.redirect(`app://auth?error=authentication_failed`);
    }
  }

  // Verificar token JWT
  @Post('verify')
  async verifyToken(@Body() body: { token: string }) {
    const user = await this.authService.verifyToken(body.token);

    if (!user) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid token',
      };
    }

    return {
      statusCode: HttpStatus.OK,
      data: { user },
    };
  }

  // Obtener perfil del usuario autenticado
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    return {
      statusCode: HttpStatus.OK,
      data: { user: req.user },
    };
  }
}
