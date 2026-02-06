import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { ALERT_EVAL_QUEUE, NOTIFICATION_QUEUE } from './queue.constants';

const parseRedisUrl = (input?: string) => {
  if (!input) return { host: '127.0.0.1', port: 6379 };
  const url = new URL(input);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
};

@Module({
  imports: [
    BullModule.forRoot({
      connection: parseRedisUrl(process.env.REDIS_URL),
    }),
    BullModule.registerQueue(
      { name: ALERT_EVAL_QUEUE },
      { name: NOTIFICATION_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}

