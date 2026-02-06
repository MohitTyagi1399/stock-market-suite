import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { marketSchema } from '@stock/shared';

import { AuthGuard } from '../auth/auth.guard';
import { zodParse } from '../common/zod';
import { InstrumentsService } from './instruments.service';

const upsertInstrumentSchema = z.object({
  id: z.string().min(1).max(80),
  symbol: z.string().min(1).max(40),
  exchange: z.string().max(20).optional(),
  market: marketSchema,
  name: z.string().max(120).optional(),
  metadata: z.any().optional(),
});

@UseGuards(AuthGuard)
@Controller('/instruments')
export class InstrumentsController {
  constructor(private readonly instruments: InstrumentsService) {}

  @Post('/upsert')
  async upsert(@Body() body: unknown) {
    const input = zodParse(upsertInstrumentSchema, body);
    return await this.instruments.upsert(input);
  }

  @Get('/search')
  async search(@Query('q') q = '', @Query('market') market?: string) {
    const parsedMarket = market ? zodParse(marketSchema, market.toUpperCase()) : undefined;
    return await this.instruments.search(q, parsedMarket);
  }

  @Get('/:id')
  async getOne(@Param('id') id: string) {
    return await this.instruments.getOne(id);
  }
}

