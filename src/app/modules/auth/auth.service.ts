import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateOAuthLogin(user: any, provider: string) {
    // Buscar en BD si ya existe, si no crear
    const payload = {
      sub: user.id, // id interno de tu DB
      email: user.email,
      provider,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async validateGoogleAccessToken(accessToken: string, userInfo: any) {
    // 1. VERIFICAR EL TOKEN (Ejemplo usando Axios)
    // const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    // if (googleResponse.data.error) {
    //   throw new UnauthorizedException('Token de Google inválido');
    // }

    // 2. BUSCAR O CREAR USUARIO EN TU BD basándote en userInfo.id o userInfo.email
    /* let user = await this.userService.findByGoogleId(userInfo.id);
    if (!user) {
      user = await this.userService.create({
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        // ... otros campos
      });
    } */

    // 3. GENERAR JWT PROPIO
    /*  const payload = {
      sub: user.id, // ID interno de tu base de datos
      email: user.email,
    }; */

    return {
      /*   accessToken: this.jwtService.sign(payload),
      user: user, */
    };
  }
}
