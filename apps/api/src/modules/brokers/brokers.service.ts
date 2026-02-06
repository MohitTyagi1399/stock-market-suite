import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Broker } from '@stock/shared';
import { createAlpacaAdapter, createMockAdapter, createZerodhaAdapter } from '@stock/brokers';

import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';

type AlpacaCreds = { keyId: string; secretKey: string; env: 'paper' | 'live' };
type ZerodhaCreds = { apiKey: string; accessToken: string };

@Injectable()
export class BrokersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoSvc: CryptoService,
  ) {}

  private get sandboxMode() {
    return (process.env.BROKER_SANDBOX_MODE ?? '').toLowerCase() === 'true';
  }

  async listConnections(userId: string) {
    const connections = await this.prisma.brokerConnection.findMany({
      where: { userId },
      select: { broker: true, status: true, updatedAt: true, createdAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { connections };
  }

  async connectAlpaca(userId: string, creds: AlpacaCreds) {
    if (!this.sandboxMode) {
      const adapter = createAlpacaAdapter(creds);
      await adapter.validateConnection();
    }

    await this.prisma.brokerConnection.upsert({
      where: { userId_broker: { userId, broker: 'ALPACA' } },
      create: {
        userId,
        broker: 'ALPACA',
        status: 'CONNECTED',
        credentialsEnc: this.cryptoSvc.encryptJson(creds),
      },
      update: {
        status: 'CONNECTED',
        credentialsEnc: this.cryptoSvc.encryptJson(creds),
      },
    });
    return { ok: true };
  }

  async connectZerodha(userId: string, creds: ZerodhaCreds) {
    if (!this.sandboxMode) {
      const adapter = createZerodhaAdapter(creds);
      await adapter.validateConnection();
    }

    await this.prisma.brokerConnection.upsert({
      where: { userId_broker: { userId, broker: 'ZERODHA' } },
      create: {
        userId,
        broker: 'ZERODHA',
        status: 'CONNECTED',
        credentialsEnc: this.cryptoSvc.encryptJson(creds),
      },
      update: {
        status: 'CONNECTED',
        credentialsEnc: this.cryptoSvc.encryptJson(creds),
      },
    });
    return { ok: true };
  }

  async validate(userId: string, broker: Broker) {
    const adapter = await this.getAdapterForUser(userId, broker);
    await adapter.validateConnection();
  }

  async getAdapterForUser(userId: string, broker: Broker) {
    if (this.sandboxMode) {
      return createMockAdapter({ broker, accountKey: userId });
    }
    const record = await this.prisma.brokerConnection.findUnique({
      where: { userId_broker: { userId, broker } },
      select: { credentialsEnc: true },
    });
    if (!record) throw new NotFoundException('Broker not connected');
    if (broker === 'ALPACA') {
      const creds = this.cryptoSvc.decryptJson<AlpacaCreds>(record.credentialsEnc);
      return createAlpacaAdapter(creds);
    }
    if (broker === 'ZERODHA') {
      const creds = this.cryptoSvc.decryptJson<ZerodhaCreds>(record.credentialsEnc);
      return createZerodhaAdapter(creds);
    }
    throw new BadRequestException('Unsupported broker');
  }
}
