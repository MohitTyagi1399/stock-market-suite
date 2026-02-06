import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { candlesQuerySchema } from '@stock/shared';

import { AuthGuard } from '../auth/auth.guard';
import { zodParse } from '../common/zod';
import { MarketService } from './market.service';

@UseGuards(AuthGuard)
@Controller('/market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('/:instrumentId/quote')
  async quote(@Req() req: Request, @Param('instrumentId') instrumentId: string) {
    return await this.market.getQuote((req as any).auth.userId, instrumentId);
  }

  @Get('/:instrumentId/candles')
  async candles(
    @Req() req: Request,
    @Param('instrumentId') instrumentId: string,
    @Query() query: unknown,
  ) {
    const parsed = zodParse(candlesQuerySchema, query);
    return await this.market.getCandles((req as any).auth.userId, instrumentId, parsed);
  }
}

