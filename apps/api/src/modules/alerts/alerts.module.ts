import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueuesModule } from '../infra/queues.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertsController } from './alerts.controller';
import { AlertEvalProcessor } from './alerts.processor';
import { AlertsService } from './alerts.service';
import { AlertsSchedulerService } from './alerts.scheduler';

@Module({
  imports: [AuthModule, QueuesModule, NotificationsModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsSchedulerService, AlertEvalProcessor],
})
export class AlertsModule {}
