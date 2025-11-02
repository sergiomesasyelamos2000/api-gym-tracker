import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserEntity } from '@app/entity-data-models';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateGoogleUser(googleProfile: any): Promise<UserEntity> {
    let user = await this.usersService.findByGoogleId(googleProfile.googleId);

    if (!user) {
      user = await this.usersService.findByEmail(googleProfile.email);

      if (user) {
        // Usuario existe con email pero sin googleId, actualizar
        user = await this.usersService.updateUser(user.id, {
          googleId: googleProfile.googleId,
          picture: googleProfile.picture,
        });
      } else {
        // Crear nuevo usuario
        user = await this.usersService.createFromGoogle(googleProfile);
      }
    }

    return user;
  }

  async login(user: UserEntity) {
    const payload = {
      email: user.email,
      sub: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      },
    };
  }

  async verifyToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.usersService.findById(decoded.sub);

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      };
    } catch (error) {
      return null;
    }
  }
}
