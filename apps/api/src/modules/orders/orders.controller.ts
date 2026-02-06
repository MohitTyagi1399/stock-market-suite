import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { placeOrderSchema } from '@stock/shared';

import { AuthGuard } from '../auth/auth.guard';
import { zodParse } from '../common/zod';
import { OrdersService } from './orders.service';

@UseGuards(AuthGuard)
@Controller('/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  async place(@Req() req: Request, @Body() body: unknown) {
    const input = zodParse(placeOrderSchema, body);
    return await this.orders.placeOrder((req as any).auth.userId, input);
  }

  @Get()
  async list(@Req() req: Request) {
    return await this.orders.list((req as any).auth.userId);
  }

  @Post('/:id/cancel')
  @HttpCode(200)
  async cancel(@Req() req: Request, @Param('id') id: string) {
    return await this.orders.cancel((req as any).auth.userId, id);
  }

  @Post('/sync')
  @HttpCode(200)
  async sync(@Req() req: Request) {
    return await this.orders.syncFromBrokers((req as any).auth.userId);
  }
}

