import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { addWatchlistItemSchema, createWatchlistSchema } from '@stock/shared';

import { AuthGuard } from '../auth/auth.guard';
import { zodParse } from '../common/zod';
import { WatchlistsService } from './watchlists.service';

@UseGuards(AuthGuard)
@Controller('/watchlists')
export class WatchlistsController {
  constructor(private readonly watchlists: WatchlistsService) {}

  @Post()
  async create(@Req() req: Request, @Body() body: unknown) {
    const input = zodParse(createWatchlistSchema, body);
    return await this.watchlists.create((req as any).auth.userId, input.name);
  }

  @Get()
  async list(@Req() req: Request) {
    return await this.watchlists.list((req as any).auth.userId);
  }

  @Post('/:id/items')
  async addItem(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const input = zodParse(addWatchlistItemSchema, body);
    return await this.watchlists.addItem((req as any).auth.userId, id, input.instrumentId);
  }

  @Delete('/:id/items/:instrumentId')
  async removeItem(@Req() req: Request, @Param('id') id: string, @Param('instrumentId') instrumentId: string) {
    return await this.watchlists.removeItem((req as any).auth.userId, id, instrumentId);
  }
}

