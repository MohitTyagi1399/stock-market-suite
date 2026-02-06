import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const STARTER_INSTRUMENTS: Array<{
  id: string;
  symbol: string;
  market: 'US' | 'IN';
  exchange?: string;
  name: string;
  metadata?: Record<string, unknown>;
}> = [
  { id: 'AAPL', symbol: 'AAPL', market: 'US', exchange: 'NASDAQ', name: 'Apple Inc.' },
  { id: 'MSFT', symbol: 'MSFT', market: 'US', exchange: 'NASDAQ', name: 'Microsoft Corp.' },
  { id: 'SLV', symbol: 'SLV', market: 'US', exchange: 'NYSEARCA', name: 'iShares Silver Trust' },
  { id: 'NSE:TATASTEEL', symbol: 'TATASTEEL', market: 'IN', exchange: 'NSE', name: 'Tata Steel Ltd.' },
  { id: 'NSE:TATAMOTORS', symbol: 'TATAMOTORS', market: 'IN', exchange: 'NSE', name: 'Tata Motors Ltd.' },
  { id: 'NSE:HDFCBANK', symbol: 'HDFCBANK', market: 'IN', exchange: 'NSE', name: 'HDFC Bank Ltd.' },
  { id: 'NSE:HDFCLIFE', symbol: 'HDFCLIFE', market: 'IN', exchange: 'NSE', name: 'HDFC Life Insurance Co. Ltd.' },
  { id: 'NSE:SILVERBEES', symbol: 'SILVERBEES', market: 'IN', exchange: 'NSE', name: 'Nippon India Silver ETF' },
];

@Injectable()
export class WatchlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string) {
    const existingCount = await this.prisma.watchlist.count({ where: { userId } });
    const watchlist = await this.prisma.watchlist.create({
      data: { userId, name, pinned: existingCount === 0 },
      select: { id: true, name: true, pinned: true, createdAt: true },
    });
    return { watchlist };
  }

  async list(userId: string) {
    await this.ensureStarterWatchlist(userId);
    const watchlists = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        pinned: true,
        items: { select: { instrument: { select: { id: true, symbol: true, market: true, exchange: true, name: true } } } },
      },
    });
    return { watchlists };
  }

  private async assertOwner(userId: string, watchlistId: string) {
    const wl = await this.prisma.watchlist.findUnique({ where: { id: watchlistId }, select: { userId: true } });
    if (!wl) throw new NotFoundException('Watchlist not found');
    if (wl.userId !== userId) throw new ForbiddenException();
  }

  async addItem(userId: string, watchlistId: string, instrumentId: string) {
    await this.assertOwner(userId, watchlistId);
    const instrument = await this.prisma.instrument.findUnique({ where: { id: instrumentId }, select: { id: true } });
    if (!instrument) throw new NotFoundException('Instrument not found');
    await this.prisma.watchlistItem.upsert({
      where: { watchlistId_instrumentId: { watchlistId, instrumentId } },
      create: { watchlistId, instrumentId },
      update: {},
    });
    return { ok: true };
  }

  async removeItem(userId: string, watchlistId: string, instrumentId: string) {
    await this.assertOwner(userId, watchlistId);
    await this.prisma.watchlistItem.deleteMany({ where: { watchlistId, instrumentId } });
    return { ok: true };
  }

  private async ensureStarterWatchlist(userId: string) {
    const existingCount = await this.prisma.watchlist.count({ where: { userId } });
    if (existingCount > 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const inst of STARTER_INSTRUMENTS) {
        await tx.instrument.upsert({
          where: { id: inst.id },
          create: {
            id: inst.id,
            symbol: inst.symbol,
            market: inst.market,
            exchange: inst.exchange,
            name: inst.name,
            metadata: (inst.metadata ?? {}) as any,
          },
          update: {
            symbol: inst.symbol,
            market: inst.market,
            exchange: inst.exchange,
            name: inst.name,
          },
        });
      }

      const watchlist = await tx.watchlist.create({
        data: {
          userId,
          name: 'Market Pulse',
          pinned: true,
        },
        select: { id: true },
      });

      await tx.watchlistItem.createMany({
        data: STARTER_INSTRUMENTS.map((inst) => ({
          watchlistId: watchlist.id,
          instrumentId: inst.id,
        })),
        skipDuplicates: true,
      });
    });
  }
}
