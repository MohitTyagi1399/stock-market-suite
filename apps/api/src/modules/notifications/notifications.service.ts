import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_QUEUE } from '../infra/queue.constants';

type PushNotificationPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue,
  ) {}

  async registerDevice(userId: string, input: { token: string; platform?: string }) {
    await this.prisma.notificationDevice.upsert({
      where: { userId_token: { userId, token: input.token } },
      create: { userId, token: input.token, platform: input.platform ?? null },
      update: { platform: input.platform ?? null, updatedAt: new Date() },
    });
    return { ok: true };
  }

  async listInbox(userId: string, limit = 50) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;
    const events = await this.prisma.alertEvent.findMany({
      where: { rule: { userId } },
      orderBy: { triggeredAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        triggeredAt: true,
        payload: true,
        rule: {
          select: {
            id: true,
            type: true,
            instrument: { select: { id: true, symbol: true, market: true, exchange: true } },
          },
        },
      },
    });
    return { events };
  }

  async queuePushNotification(payload: PushNotificationPayload) {
    await this.queue.add('push', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
