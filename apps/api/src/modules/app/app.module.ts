import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BrokersModule } from '../brokers/brokers.module';
import { InstrumentsModule } from '../instruments/instruments.module';
import { WatchlistsModule } from '../watchlists/watchlists.module';
import { MarketModule } from '../market/market.module';
import { OrdersModule } from '../orders/orders.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { AlertsModule } from '../alerts/alerts.module';
import { QueuesModule } from '../infra/queues.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    QueuesModule,
    AuthModule,
    BrokersModule,
    InstrumentsModule,
    WatchlistsModule,
    MarketModule,
    OrdersModule,
    PortfolioModule,
    AlertsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
