import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Broker, OrderStatus } from '@stock/shared';

import { PrismaService } from '../prisma/prisma.service';
import { BrokersService } from '../brokers/brokers.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brokers: BrokersService,
  ) {}

  async placeOrder(userId: string, input: any) {
    const instrument = await this.prisma.instrument.findUnique({
      where: { id: input.instrumentId },
      select: { id: true, market: true },
    });
    if (!instrument) throw new NotFoundException('Instrument not found');
    if (input.broker === 'ALPACA' && instrument.market !== 'US') {
      throw new BadRequestException('Instrument market mismatch (expected US)');
    }
    if (input.broker === 'ZERODHA' && instrument.market !== 'IN') {
      throw new BadRequestException('Instrument market mismatch (expected IN)');
    }
    if (input.type === 'LIMIT' && !input.limitPrice) {
      throw new BadRequestException('limitPrice required for LIMIT');
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        broker: input.broker,
        instrumentId: instrument.id,
        side: input.side,
        type: input.type,
        qty: input.qty,
        limitPrice: input.limitPrice,
        status: 'PENDING',
      },
      select: { id: true },
    });

    try {
      const adapter = await this.brokers.getAdapterForUser(userId, input.broker as Broker);
      const externalInstrumentId = instrument.market === 'US' ? instrument.id : instrument.id; // IN uses "NSE:INFY" style id
      const result = await adapter.placeOrder({
        instrumentId: externalInstrumentId,
        side: input.side,
        type: input.type,
        qty: input.qty,
        limitPrice: input.limitPrice,
        timeInForce: input.broker === 'ALPACA' ? 'day' : 'day',
      });
      const mappedStatus = this.mapStatus(result.status) ?? 'ACCEPTED';

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          brokerOrderId: result.brokerOrderId || null,
          status: mappedStatus,
          rawPayload: result.raw as any,
        },
        select: { id: true, brokerOrderId: true, status: true },
      });
      return { order: updated };
    } catch (e: any) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'REJECTED', rawPayload: { error: String(e?.message ?? e) } as any },
      });
      throw e;
    }
  }

  async list(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        broker: true,
        brokerOrderId: true,
        status: true,
        side: true,
        type: true,
        qty: true,
        limitPrice: true,
        createdAt: true,
        instrument: { select: { id: true, symbol: true, market: true, exchange: true, name: true } },
      },
    });
    return { orders };
  }

  async cancel(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, broker: true, brokerOrderId: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException();
    if (!order.brokerOrderId) throw new BadRequestException('Order not placed at broker');
    if (order.status === 'CANCELED' || order.status === 'FILLED') return { ok: true };
    const adapter = await this.brokers.getAdapterForUser(userId, order.broker as Broker);
    await adapter.cancelOrder(order.brokerOrderId);
    await this.prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELED' } });
    return { ok: true };
  }

  async syncFromBrokers(userId: string) {
    const connections = await this.prisma.brokerConnection.findMany({
      where: { userId },
      select: { broker: true },
    });
    const updated: Array<{ broker: string; count: number }> = [];
    for (const c of connections) {
      const adapter = await this.brokers.getAdapterForUser(userId, c.broker as Broker);
      const remote = await adapter.listOrders({ status: 'all', limit: 200 });
      let count = 0;
      for (const o of remote) {
        if (!o.brokerOrderId) continue;
        const mapped = this.mapStatus(o.status);
        if (!mapped) continue;
        await this.prisma.order.updateMany({
          where: { userId, broker: c.broker as any, brokerOrderId: o.brokerOrderId },
          data: { status: mapped },
        });
        count++;
      }
      updated.push({ broker: c.broker, count });
    }
    return { updated };
  }

  private mapStatus(status?: string): OrderStatus | null {
    const s = (status ?? '').toLowerCase();
    if (!s) return null;
    if (s.includes('fill')) return 'FILLED';
    if (s.includes('partial')) return 'PARTIALLY_FILLED';
    if (s.includes('cancel')) return 'CANCELED';
    if (s.includes('reject')) return 'REJECTED';
    if (s.includes('new') || s.includes('accepted') || s.includes('open')) return 'ACCEPTED';
    return null;
  }
}
