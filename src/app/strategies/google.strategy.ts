import { Injectable } from '@nestjs/common';
import { VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy {
  constructor() {}

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, id } = profile;
    const user = {
      providerId: id,
      email: emails[0].value,
      name: name.givenName + ' ' + name.familyName,
    };
    done(null, user);
  }
}
