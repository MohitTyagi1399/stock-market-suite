import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_QUEUE } from '../infra/queue.constants';

type PushNotificationPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<PushNotificationPayload>) {
    if (job.name !== 'push') return;
    const payload = job.data;
    const devices = await this.prisma.notificationDevice.findMany({
      where: { userId: payload.userId },
      select: { token: true },
      take: 30,
    });
    if (!devices.length) return;

    const messages = devices.map((d) => ({
      to: d.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Expo push failed (${response.status}): ${text || response.statusText}`);
      }
    } catch (error) {
      this.logger.warn(String(error));
      throw error;
    }
  }
}

