import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { ALERT_EVAL_QUEUE } from '../infra/queue.constants';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(ALERT_EVAL_QUEUE) private readonly evalQueue: Queue,
  ) {}

  async create(userId: string, input: { instrumentId: string; type: string; params: Record<string, any> }) {
    const instrument = await this.prisma.instrument.findUnique({ where: { id: input.instrumentId }, select: { id: true } });
    if (!instrument) throw new NotFoundException('Instrument not found');
    const rule = await this.prisma.alertRule.create({
      data: {
        userId,
        instrumentId: input.instrumentId,
        type: input.type,
        params: input.params as any,
        enabled: true,
      },
      select: { id: true, type: true, enabled: true, createdAt: true },
    });
    return { rule };
  }

  async list(userId: string) {
    const rules = await this.prisma.alertRule.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, instrumentId: true, type: true, enabled: true, params: true, updatedAt: true },
    });
    return { rules };
  }

  async enqueueEvaluation(userId?: string) {
    await this.evalQueue.add(
      'evaluate',
      { userId: userId ?? null },
      {
        jobId: userId ? `eval:${userId}:${Date.now()}` : undefined,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    return { queued: true };
  }
}
