import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log('🔐 JwtAuthGuard.canActivate() called');
    console.log('🔍 Authorization header:', authHeader ? 'Present' : 'Missing');

    if (authHeader) {
      const tokenPreview = authHeader.substring(0, 30) + '...';
      console.log('🔍 Token preview:', tokenPreview);
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('🔐 JwtAuthGuard.handleRequest() called');
    console.log('🔍 Error:', err);
    console.log('🔍 User:', user ? `Found: ${user.email}` : 'Not found');
    console.log('🔍 Info:', info);

    if (err || !user) {
      console.log('❌ JWT Authentication failed');
      console.log('❌ Error details:', err?.message || 'No error message');
      console.log('❌ Info details:', info?.message || 'No info message');
      throw err || new UnauthorizedException('Authentication failed');
    }

    console.log('✅ JWT Authentication successful for user:', user.email);
    return user;
  }
}
