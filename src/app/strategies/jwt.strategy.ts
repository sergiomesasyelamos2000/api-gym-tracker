import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../modules/auth/user.service';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  provider: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Retorna el usuario completo que se agregará a request.user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      profilePicture: user.profilePicture,
    };
  }
}
