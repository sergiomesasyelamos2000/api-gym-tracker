import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { GoogleStrategy } from '../../strategies/google.strategy';
import { AppleStrategy } from '../../strategies/apple.strategy';
import { JwtStrategy } from '../../strategies/jwt.strategy';
import { LocalStrategy } from '../../strategies/local.strategy';
import { AuthController } from './auth.controller';
import { UserEntity } from '@app/entity-data-models';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    GoogleStrategy,
    AppleStrategy,
    JwtStrategy,
    LocalStrategy,
  ],
  exports: [AuthService, UserService, JwtModule],
})
export class AuthModule {}
