import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { instrumentIdSchema } from '@stock/shared';

import { AuthGuard } from '../auth/auth.guard';
import { zodParse } from '../common/zod';
import { AlertsService } from './alerts.service';

const createAlertSchema = z.object({
  instrumentId: instrumentIdSchema,
  type: z.enum(['PRICE_ABOVE', 'PRICE_BELOW', 'RSI_OVERBOUGHT', 'RSI_OVERSOLD']),
  params: z.record(z.string(), z.any()).default({}),
});

@UseGuards(AuthGuard)
@Controller('/alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Post()
  async create(@Req() req: Request, @Body() body: unknown) {
    const input = zodParse(createAlertSchema, body);
    return await this.alerts.create((req as any).auth.userId, input);
  }

  @Get()
  async list(@Req() req: Request) {
    return await this.alerts.list((req as any).auth.userId);
  }

  @Post('/evaluate-now')
  @HttpCode(202)
  async evaluateNow(@Req() req: Request) {
    return await this.alerts.enqueueEvaluation((req as any).auth.userId);
  }
}
