import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createUserSchema, signInSchema } from '@stock/shared';

import { zodParse } from '../common/zod';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('/signup')
  async signUp(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = zodParse(createUserSchema, body);
    return await this.auth.signUp(input, req, res);
  }

  @Post('/signin')
  @HttpCode(200)
  async signIn(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = zodParse(signInSchema, body);
    return await this.auth.signIn(input, req, res);
  }

  @Post('/refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return await this.auth.refresh(req, res);
  }

  @Post('/signout')
  @HttpCode(200)
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return await this.auth.signOut(req, res);
  }

  @UseGuards(AuthGuard)
  @Post('/sessions/revoke-others')
  @HttpCode(200)
  async revokeOthers(@Req() req: Request) {
    return await this.auth.revokeOtherSessions((req as any).auth);
  }

  @UseGuards(AuthGuard)
  @Get('/me')
  async me(@Req() req: Request) {
    return await this.auth.me((req as any).auth);
  }

  @UseGuards(AuthGuard)
  @Post('/mfa/setup')
  async mfaSetup(@Req() req: Request) {
    return await this.auth.mfaSetup((req as any).auth);
  }

  @UseGuards(AuthGuard)
  @Post('/mfa/enable')
  async mfaEnable(@Req() req: Request, @Body() body: any) {
    return await this.auth.mfaEnable((req as any).auth, body?.code);
  }

  @UseGuards(AuthGuard)
  @Post('/mfa/disable')
  async mfaDisable(@Req() req: Request, @Body() body: any) {
    return await this.auth.mfaDisable((req as any).auth, body?.code);
  }
}

