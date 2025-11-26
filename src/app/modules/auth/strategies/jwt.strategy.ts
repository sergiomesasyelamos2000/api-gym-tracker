import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '@app/entity-data-models';

export interface JwtPayload {
  sub: string; // user id
  email: string;
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

    console.log(
      '🔧 JwtStrategy initialized with secret:',
      secret.substring(0, 10) + '...',
    );
  }

  async validate(payload: JwtPayload) {
    console.log('🔍 JwtStrategy.validate() called with payload:', payload);

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    console.log(
      '🔍 User lookup result:',
      user ? `Found user: ${user.email}` : 'User not found',
    );

    if (!user) {
      console.log(
        '❌ JwtStrategy: User not found, throwing UnauthorizedException',
      );
      throw new UnauthorizedException('User not found');
    }

    console.log('✅ JwtStrategy: Validation successful, returning user data');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
