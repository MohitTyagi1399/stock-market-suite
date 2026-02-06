import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

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
}

