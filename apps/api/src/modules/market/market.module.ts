import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { BrokersModule } from '../brokers/brokers.module';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { QuotesGateway } from './quotes.gateway';

@Module({
  imports: [AuthModule, BrokersModule],
  controllers: [MarketController],
  providers: [MarketService, QuotesGateway],
})
export class MarketModule {}

