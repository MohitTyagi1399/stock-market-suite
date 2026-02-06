import { Injectable, NotFoundException } from '@nestjs/common';
import type { Market } from '@stock/shared';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstrumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: {
    id: string;
    symbol: string;
    exchange?: string;
    market: Market;
    name?: string;
    metadata?: unknown;
  }) {
    const instrument = await this.prisma.instrument.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        symbol: input.symbol,
        exchange: input.exchange,
        market: input.market,
        name: input.name,
        metadata: input.metadata as any,
      },
      update: {
        symbol: input.symbol,
        exchange: input.exchange,
        market: input.market,
        name: input.name,
        metadata: input.metadata as any,
      },
      select: { id: true, symbol: true, market: true, exchange: true, name: true },
    });
    return { instrument };
  }

  async search(q: string, market?: Market) {
    const query = q.trim();
    const instruments = await this.prisma.instrument.findMany({
      where: {
        ...(market ? { market } : {}),
        ...(query
          ? {
              OR: [
                { symbol: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
                { id: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: 50,
      orderBy: [{ symbol: 'asc' }],
      select: { id: true, symbol: true, market: true, exchange: true, name: true },
    });
    return { instruments };
  }

  async getOne(id: string) {
    const instrument = await this.prisma.instrument.findUnique({
      where: { id },
      select: { id: true, symbol: true, market: true, exchange: true, name: true, metadata: true },
    });
    if (!instrument) throw new NotFoundException('Instrument not found');
    return { instrument };
  }
}

