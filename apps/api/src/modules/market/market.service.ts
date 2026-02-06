import { Injectable, NotFoundException } from '@nestjs/common';
import type { Broker, Timeframe } from '@stock/shared';

import { PrismaService } from '../prisma/prisma.service';
import { BrokersService } from '../brokers/brokers.service';

@Injectable()
export class MarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brokers: BrokersService,
  ) {}

  private async resolveBrokerForInstrument(instrumentId: string): Promise<{ broker: Broker; market: 'US' | 'IN'; externalIdForQuote: string; externalIdForCandles: string }> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { id: instrumentId },
      select: { id: true, market: true, metadata: true },
    });
    if (!instrument) throw new NotFoundException('Instrument not found');
    if (instrument.market === 'US') {
      return {
        broker: 'ALPACA',
        market: 'US',
        externalIdForQuote: instrument.id,
        externalIdForCandles: instrument.id,
      };
    }
    const md = (instrument.metadata ?? {}) as any;
    const token = md.instrumentToken ? String(md.instrumentToken) : '';
    if (!token) {
      throw new NotFoundException('IN instruments require metadata.instrumentToken for candles');
    }
    return {
      broker: 'ZERODHA',
      market: 'IN',
      externalIdForQuote: instrument.id,
      externalIdForCandles: token,
    };
  }

  async getQuote(userId: string, instrumentId: string) {
    const resolved = await this.resolveBrokerForInstrument(instrumentId);
    const adapter = await this.brokers.getAdapterForUser(userId, resolved.broker);
    const quote = await adapter.getQuote(resolved.externalIdForQuote);
    return { quote };
  }

  async getCandles(
    userId: string,
    instrumentId: string,
    args: { timeframe: Timeframe; from: string; to: string },
  ) {
    const resolved = await this.resolveBrokerForInstrument(instrumentId);
    const adapter = await this.brokers.getAdapterForUser(userId, resolved.broker);
    const candles = await adapter.getCandles({
      instrumentId: resolved.externalIdForCandles,
      timeframe: args.timeframe,
      from: args.from,
      to: args.to,
    });

    await this.prisma.candle.createMany({
      data: candles.map((c) => ({
        instrumentId,
        timeframe: args.timeframe,
        t: new Date(c.t),
        o: c.o,
        h: c.h,
        l: c.l,
        c: c.c,
        v: c.v,
      })),
      skipDuplicates: true,
    });

    const stored = await this.prisma.candle.findMany({
      where: {
        instrumentId,
        timeframe: args.timeframe,
        t: { gte: new Date(args.from), lte: new Date(args.to) },
      },
      orderBy: { t: 'asc' },
      select: { t: true, o: true, h: true, l: true, c: true, v: true },
    });

    return {
      candles: stored.map((c) => ({
        t: c.t.toISOString(),
        o: c.o,
        h: c.h,
        l: c.l,
        c: c.c,
        v: c.v,
      })),
    };
  }
}
