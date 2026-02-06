import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request as ExpressRequest } from 'express';

export type AuthContext = {
  userId: string;
  sessionId: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<ExpressRequest & { auth?: AuthContext }>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = header.slice('Bearer '.length);
    try {
      const payload = this.jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
      if (!payload?.sub || !payload?.sid) throw new UnauthorizedException('Invalid token');
      req.auth = { userId: String(payload.sub), sessionId: String(payload.sid) } satisfies AuthContext;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
