import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './types';

export const AUTH_COOKIE = 'cybera_token';

/* Reads the JWT from the httpOnly cookie and attaches the decoded user
   to the request. Throws 401 on absent/invalid/expired tokens. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[AUTH_COOKIE];
    if (!token) throw new UnauthorizedException('Not logged in');
    try {
      const payload = await this.jwt.verifyAsync<AuthUser & { sub: number }>(token);
      request.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      } satisfies AuthUser;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
