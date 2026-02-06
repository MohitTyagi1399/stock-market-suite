import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

import { BrokersService } from '../brokers/brokers.service';
import { PrismaService } from '../prisma/prisma.service';

type SubscribePayload = {
  accessToken: string;
  instrumentIds: string[];
};

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class QuotesGateway {
  private readonly logger = new Logger(QuotesGateway.name);
  @WebSocketServer() server!: Server;

  private readonly socketState = new Map<string, { timer?: NodeJS.Timeout; userId?: string; instrumentIds: string[] }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly brokers: BrokersService,
    private readonly jwt: JwtService,
  ) {}

  handleDisconnect(client: Socket) {
    const state = this.socketState.get(client.id);
    if (state?.timer) clearInterval(state.timer);
    this.socketState.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribePayload) {
    const userId = this.verifyAccessToken(body?.accessToken);
    if (!userId) return { ok: false, error: 'invalid accessToken' };
    const instrumentIds = Array.isArray(body.instrumentIds) ? body.instrumentIds.slice(0, 50) : [];
    const prev = this.socketState.get(client.id);
    if (prev?.timer) clearInterval(prev.timer);

    const state = { userId, instrumentIds, timer: undefined as any };
    state.timer = setInterval(() => void this.tick(client.id).catch(() => {}), 2000);
    this.socketState.set(client.id, state);
    await this.tick(client.id);
    return { ok: true };
  }

  private verifyAccessToken(token?: string): string | null {
    if (!token) return null;
    try {
      const payload = this.jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
      if (!payload?.sub) return null;
      return String(payload.sub);
    } catch {
      return null;
    }
  }

  private async tick(socketId: string) {
    const state = this.socketState.get(socketId);
    if (!state?.userId || state.instrumentIds.length === 0) return;
    const client = this.server.sockets.sockets.get(socketId);
    if (!client) return;

    const instruments = await this.prisma.instrument.findMany({
      where: { id: { in: state.instrumentIds } },
      select: { id: true, market: true, metadata: true },
    });

    const out: any[] = [];
    for (const inst of instruments) {
      try {
        if (inst.market === 'US') {
          const adapter = await this.brokers.getAdapterForUser(state.userId, 'ALPACA');
          const q = await adapter.getQuote(inst.id);
          out.push({ instrumentId: inst.id, last: q.last, ts: q.ts });
        } else {
          const adapter = await this.brokers.getAdapterForUser(state.userId, 'ZERODHA');
          const q = await adapter.getQuote(inst.id);
          out.push({ instrumentId: inst.id, last: q.last, ts: q.ts });
        }
      } catch (e: any) {
        this.logger.debug(`quote failed for ${inst.id}: ${String(e?.message ?? e)}`);
      }
    }
    if (out.length) client.emit('quotes', out);
  }
}
