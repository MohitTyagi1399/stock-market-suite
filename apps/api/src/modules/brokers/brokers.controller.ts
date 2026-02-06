import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { brokerSchema } from '@stock/shared';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard';
import { zodParse } from '../common/zod';
import { BrokersService } from './brokers.service';

const alpacaConnectSchema = z.object({
  keyId: z.string().min(1),
  secretKey: z.string().min(1),
  env: z.enum(['paper', 'live']).default('paper'),
});

const zerodhaConnectSchema = z.object({
  apiKey: z.string().min(1),
  accessToken: z.string().min(1),
});

@UseGuards(AuthGuard)
@Controller('/brokers')
export class BrokersController {
  constructor(private readonly brokers: BrokersService) {}

  @Get()
  async list(@Req() req: Request) {
    return await this.brokers.listConnections((req as any).auth.userId);
  }

  @Post('/alpaca/connect')
  async connectAlpaca(@Req() req: Request, @Body() body: unknown) {
    const input = zodParse(alpacaConnectSchema, body);
    return await this.brokers.connectAlpaca((req as any).auth.userId, input);
  }

  @Post('/zerodha/connect')
  async connectZerodha(@Req() req: Request, @Body() body: unknown) {
    const input = zodParse(zerodhaConnectSchema, body);
    return await this.brokers.connectZerodha((req as any).auth.userId, input);
  }

  @Post('/:broker/validate')
  @HttpCode(200)
  async validate(@Req() req: Request, @Param('broker') brokerRaw: string) {
    const broker = zodParse(brokerSchema, brokerRaw.toUpperCase());
    await this.brokers.validate((req as any).auth.userId, broker);
    return { ok: true };
  }
}

