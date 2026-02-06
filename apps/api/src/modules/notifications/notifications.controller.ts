import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard';
import { zodParse } from '../common/zod';
import { NotificationsService } from './notifications.service';

const registerDeviceSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

@UseGuards(AuthGuard)
@Controller('/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('/device/register')
  async registerDevice(@Req() req: Request, @Body() body: unknown) {
    const input = zodParse(registerDeviceSchema, body);
    return await this.notifications.registerDevice((req as any).auth.userId, input);
  }

  @Get('/inbox')
  async inbox(@Req() req: Request, @Query('limit') limit = '50') {
    return await this.notifications.listInbox((req as any).auth.userId, Number(limit));
  }
}

