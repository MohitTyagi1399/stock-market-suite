import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { ALERT_EVAL_QUEUE } from '../infra/queue.constants';

@Injectable()
export class AlertsSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertsSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(@InjectQueue(ALERT_EVAL_QUEUE) private readonly queue: Queue) {}

  onModuleInit() {
    const intervalMs = Number(process.env.ALERT_EVAL_INTERVAL_MS ?? 60_000);
    this.timer = setInterval(() => {
      this.queue
        .add('evaluate', { userId: null }, { removeOnComplete: 100, removeOnFail: 500 })
        .catch((error) => this.logger.warn(String(error)));
    }, Math.max(intervalMs, 10_000));
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

