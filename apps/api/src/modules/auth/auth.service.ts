import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { authenticator } from 'otplib';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import type { AuthContext } from './auth.guard';

type Credentials = { email: string; password: string };

const base64url = (b: Buffer) =>
  b
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');

const mustGetEnv = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

const refreshCookieName = 'refresh_token';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cryptoSvc: CryptoService,
  ) {}

  async signUp(input: Credentials, req: Request, res: Response) {
    const email = input.email.toLowerCase();
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true, createdAt: true },
      });
      return await this.startSession(user.id, req, res, { email: user.email, createdAt: user.createdAt });
    } catch (e: any) {
      if (String(e?.code) === 'P2002') throw new BadRequestException('Email already in use');
      throw e;
    }
  }

  async signIn(input: Credentials, req: Request, res: Response) {
    const email = input.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, mfaEnabled: true, mfaSecretEnc: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    // v1: if MFA enabled, require code via x-mfa-code header (keeps API simple).
    if (user.mfaEnabled) {
      const code = String(req.headers['x-mfa-code'] ?? '');
      if (!code) throw new UnauthorizedException('MFA code required (x-mfa-code)');
      const secret = this.cryptoSvc.decryptJson<string>(user.mfaSecretEnc ?? '');
      const valid = authenticator.verify({ token: code, secret });
      if (!valid) throw new UnauthorizedException('Invalid MFA code');
    }
    return await this.startSession(user.id, req, res, { email: user.email });
  }

  async refresh(req: Request, res: Response) {
    const token = (req.cookies?.[refreshCookieName] ?? '') as string;
    if (!token) throw new UnauthorizedException('Missing refresh token');
    const hash = this.refreshTokenHash(token);
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: hash, revokedAt: null },
      select: { id: true, userId: true },
    });
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    const newRefresh = this.newRefreshToken();
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: this.refreshTokenHash(newRefresh), lastSeen: new Date() },
    });
    this.setRefreshCookie(res, newRefresh);
    const access = this.newAccessToken(session.userId, session.id);
    return { accessToken: access };
  }

  async signOut(req: Request, res: Response) {
    const token = (req.cookies?.[refreshCookieName] ?? '') as string;
    if (token) {
      const hash = this.refreshTokenHash(token);
      await this.prisma.session.updateMany({
        where: { refreshTokenHash: hash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie(refreshCookieName);
    return { ok: true };
  }

  async revokeOtherSessions(ctx: AuthContext) {
    await this.prisma.session.updateMany({
      where: { userId: ctx.userId, id: { not: ctx.sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(ctx: AuthContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, email: true, mfaEnabled: true, createdAt: true },
    });
    return { user };
  }

  async mfaSetup(ctx: AuthContext) {
    const user = await this.prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true } });
    if (!user) throw new UnauthorizedException();
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'StockMarketSuite', secret);
    await this.prisma.user.update({
      where: { id: ctx.userId },
      data: { mfaSecretEnc: this.cryptoSvc.encryptJson(secret) },
    });
    return { secret, otpauth };
  }

  async mfaEnable(ctx: AuthContext, code?: string) {
    if (!code) throw new BadRequestException('Missing code');
    const user = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { mfaSecretEnc: true },
    });
    if (!user?.mfaSecretEnc) throw new BadRequestException('Run /auth/mfa/setup first');
    const secret = this.cryptoSvc.decryptJson<string>(user.mfaSecretEnc);
    const valid = authenticator.verify({ token: code, secret });
    if (!valid) throw new ForbiddenException('Invalid code');
    const recoveryCodes = Array.from({ length: 10 }).map(() => base64url(crypto.randomBytes(9)));
    const hashes = await Promise.all(recoveryCodes.map((c) => argon2.hash(c, { type: argon2.argon2id })));
    await this.prisma.user.update({
      where: { id: ctx.userId },
      data: { mfaEnabled: true, recoveryCodesHash: JSON.stringify(hashes) },
    });
    return { ok: true, recoveryCodes };
  }

  async mfaDisable(ctx: AuthContext, code?: string) {
    if (!code) throw new BadRequestException('Missing code');
    const user = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { mfaEnabled: true, mfaSecretEnc: true },
    });
    if (!user?.mfaEnabled || !user.mfaSecretEnc) return { ok: true };
    const secret = this.cryptoSvc.decryptJson<string>(user.mfaSecretEnc);
    const valid = authenticator.verify({ token: code, secret });
    if (!valid) throw new ForbiddenException('Invalid code');
    await this.prisma.user.update({
      where: { id: ctx.userId },
      data: { mfaEnabled: false, mfaSecretEnc: null, recoveryCodesHash: null },
    });
    return { ok: true };
  }

  private async startSession(userId: string, req: Request, res: Response, extra: any) {
    const refresh = this.newRefreshToken();
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.refreshTokenHash(refresh),
        device: String(req.headers['user-agent'] ?? '').slice(0, 180),
        lastSeen: new Date(),
      },
      select: { id: true },
    });
    this.setRefreshCookie(res, refresh);
    const access = this.newAccessToken(userId, session.id);
    return { accessToken: access, ...extra };
  }

  private newAccessToken(userId: string, sessionId: string) {
    return this.jwt.sign(
      { sub: userId, sid: sessionId },
      { secret: mustGetEnv('JWT_ACCESS_SECRET'), expiresIn: '15m' },
    );
  }

  private newRefreshToken() {
    return base64url(crypto.randomBytes(32));
  }

  private refreshTokenHash(token: string) {
    const secret = mustGetEnv('JWT_REFRESH_SECRET');
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  private setRefreshCookie(res: Response, token: string) {
    const secure = (process.env.COOKIE_SECURE ?? 'false') === 'true';
    res.cookie(refreshCookieName, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/auth',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }
}

