import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service';
import { RegisterDto, LoginDto, AuthResponseDto } from '@app/entity-data-models';
import { UserEntity } from '@app/entity-data-models';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.userService.create({
      email: registerDto.email,
      password: registerDto.password,
      name: registerDto.name,
      provider: 'local',
    });

    return this.generateAuthResponse(user);
  }

  async login(user: any): Promise<AuthResponseDto> {
    // El usuario ya viene validado desde LocalStrategy
    const fullUser = await this.userService.findById(user.id);
    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateAuthResponse(fullUser);
  }

  async validateOAuthLogin(oauthUser: any, provider: 'google' | 'apple'): Promise<AuthResponseDto> {
    const user = await this.userService.findOrCreateOAuthUser(provider, {
      providerId: oauthUser.providerId,
      email: oauthUser.email,
      name: oauthUser.name,
      profilePicture: oauthUser.profilePicture,
    });

    return this.generateAuthResponse(user);
  }

  async validateGoogleAccessToken(accessToken: string, userInfo: any): Promise<AuthResponseDto> {
    // Aquí podrías verificar el token con la API de Google si lo necesitas
    // Por ahora asumimos que el token ya fue validado por el frontend

    const user = await this.userService.findOrCreateOAuthUser('google', {
      providerId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      profilePicture: userInfo.picture,
    });

    return this.generateAuthResponse(user);
  }

  private generateAuthResponse(user: UserEntity): AuthResponseDto {
    const payload = {
      sub: user.id,
      email: user.email,
      provider: user.provider,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        profilePicture: user.profilePicture,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.validatePassword(email, password);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      profilePicture: user.profilePicture,
    };
  }
}
