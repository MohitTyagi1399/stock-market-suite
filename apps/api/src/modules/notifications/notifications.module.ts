import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { QueuesModule } from '../infra/queues.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [AuthModule, QueuesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
