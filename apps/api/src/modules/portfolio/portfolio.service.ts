import { Injectable } from '@nestjs/common';
import type { Broker } from '@stock/shared';

import { PrismaService } from '../prisma/prisma.service';
import { BrokersService } from '../brokers/brokers.service';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brokers: BrokersService,
  ) {}

  async getSummary(userId: string) {
    const conns = await this.prisma.brokerConnection.findMany({ where: { userId }, select: { broker: true } });
    const summaries = [];
    for (const c of conns) {
      const adapter = await this.brokers.getAdapterForUser(userId, c.broker as Broker);
      const summary = await adapter.getAccountSummary();
      await this.prisma.accountSnapshot.create({
        data: { userId, broker: c.broker as any, balances: summary.raw as any },
      });
      summaries.push(summary);
    }
    return { summaries };
  }

  async syncAndGetPositions(userId: string) {
    const conns = await this.prisma.brokerConnection.findMany({ where: { userId }, select: { broker: true } });
    for (const c of conns) {
      const adapter = await this.brokers.getAdapterForUser(userId, c.broker as Broker);
      const positions = await adapter.listPositions();
      for (const p of positions) {
        const instrumentId = p.instrumentId;
        await this.prisma.instrument.upsert({
          where: { id: instrumentId },
          create: {
            id: instrumentId,
            symbol: instrumentId.includes(':') ? instrumentId.split(':', 2)[1] : instrumentId,
            market: c.broker === 'ALPACA' ? 'US' : 'IN',
          },
          update: {},
        });
        await this.prisma.position.upsert({
          where: { userId_broker_instrumentId: { userId, broker: c.broker as any, instrumentId } },
          create: {
            userId,
            broker: c.broker as any,
            instrumentId,
            qty: p.qty,
            avgPrice: p.avgPrice ?? null,
            pnlFields: p.raw as any,
          },
          update: {
            qty: p.qty,
            avgPrice: p.avgPrice ?? null,
            pnlFields: p.raw as any,
          },
        });
      }
    }

    const positions = await this.prisma.position.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        broker: true,
        qty: true,
        avgPrice: true,
        updatedAt: true,
        instrument: { select: { id: true, symbol: true, market: true, exchange: true, name: true } },
      },
    });
    return { positions };
  }
}

