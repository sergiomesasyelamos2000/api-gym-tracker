import { UserEntity } from '@app/entity-data-models';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { userExistenceCache } from '../utils/user-existence.cache';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'super-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // New tokens embed name — existence check is cached (no full user row).
    if (payload.name) {
      const exists = await this.ensureUserExists(payload.sub);
      if (!exists) {
        throw new UnauthorizedException('User not found');
      }

      return {
        sub: payload.sub,
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    }

    // Legacy tokens without name: one minimal select, then cache existence.
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      userExistenceCache.set(payload.sub, false);
      throw new UnauthorizedException('User not found');
    }

    userExistenceCache.set(user.id, true);

    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  private async ensureUserExists(userId: string): Promise<boolean> {
    const cached = userExistenceCache.get(userId);
    if (cached !== undefined) {
      return cached;
    }

    const row = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true },
    });
    const exists = Boolean(row);
    userExistenceCache.set(userId, exists);
    return exists;
  }
}
