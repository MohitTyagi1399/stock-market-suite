import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BrokersModule } from '../brokers/brokers.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, BrokersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

