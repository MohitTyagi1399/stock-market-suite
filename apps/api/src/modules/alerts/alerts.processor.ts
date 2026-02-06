import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { rsi } from '@stock/shared';
import type { Job } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { ALERT_EVAL_QUEUE } from '../infra/queue.constants';
import { NotificationsService } from '../notifications/notifications.service';

type EvalPayload = {
  userId?: string | null;
};

type RuleType = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'RSI_OVERBOUGHT' | 'RSI_OVERSOLD';

@Processor(ALERT_EVAL_QUEUE)
export class AlertEvalProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertEvalProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<EvalPayload>) {
    if (job.name !== 'evaluate') return;
    const userId = job.data?.userId ?? undefined;
    const rules = await this.prisma.alertRule.findMany({
      where: { enabled: true, ...(userId ? { userId } : {}) },
      select: {
        id: true,
        type: true,
        params: true,
        userId: true,
        instrumentId: true,
        instrument: { select: { symbol: true } },
      },
      take: 500,
    });

    for (const rule of rules) {
      try {
        const fired = await this.evaluateRule(rule as any);
        if (!fired) continue;
        const recent = await this.prisma.alertEvent.count({
          where: {
            alertRuleId: rule.id,
            triggeredAt: { gte: new Date(Date.now() - 1000 * 60 * 5) },
          },
        });
        if (recent > 0) continue;

        const event = await this.prisma.alertEvent.create({
          data: {
            alertRuleId: rule.id,
            payload: fired.payload as any,
          },
        });

        await this.notifications.queuePushNotification({
          userId: rule.userId,
          title: `${rule.type} triggered`,
          body: `${rule.instrument.symbol} matched your alert rule`,
          data: { eventId: event.id, instrumentId: rule.instrumentId },
        });
      } catch (error) {
        this.logger.warn(`rule ${rule.id} failed: ${String(error)}`);
      }
    }
  }

  private async evaluateRule(rule: {
    id: string;
    type: RuleType;
    params: Record<string, unknown>;
    instrumentId: string;
  }): Promise<{ payload: Record<string, unknown> } | null> {
    const latest = await this.prisma.candle.findFirst({
      where: { instrumentId: rule.instrumentId, timeframe: '15m' },
      orderBy: { t: 'desc' },
      select: { c: true, t: true },
    });
    if (!latest) return null;

    const price = latest.c;
    const threshold = Number((rule.params?.threshold as number | string | undefined) ?? NaN);

    if (rule.type === 'PRICE_ABOVE' && Number.isFinite(threshold) && price > threshold) {
      return { payload: { type: rule.type, price, threshold, at: latest.t.toISOString() } };
    }
    if (rule.type === 'PRICE_BELOW' && Number.isFinite(threshold) && price < threshold) {
      return { payload: { type: rule.type, price, threshold, at: latest.t.toISOString() } };
    }
    if (rule.type === 'RSI_OVERBOUGHT' || rule.type === 'RSI_OVERSOLD') {
      const rows = await this.prisma.candle.findMany({
        where: { instrumentId: rule.instrumentId, timeframe: '15m' },
        orderBy: { t: 'asc' },
        take: 100,
        select: { c: true, t: true },
      });
      const closes = rows.map((r) => r.c);
      const values = rsi(closes, 14);
      const current = values.at(-1);
      if (current == null) return null;
      if (rule.type === 'RSI_OVERBOUGHT' && current >= 70) {
        return {
          payload: { type: rule.type, rsi: current, threshold: 70, at: rows.at(-1)?.t.toISOString() },
        };
      }
      if (rule.type === 'RSI_OVERSOLD' && current <= 30) {
        return {
          payload: { type: rule.type, rsi: current, threshold: 30, at: rows.at(-1)?.t.toISOString() },
        };
      }
    }
    return null;
  }
}

