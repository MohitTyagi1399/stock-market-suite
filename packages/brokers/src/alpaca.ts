import type { Timeframe } from '@stock/shared';
import type {
  AccountSummary,
  BrokerAdapter,
  BrokerEnv,
  BrokerOrder,
  BrokerPosition,
  Candle,
  PlaceOrderRequest,
  PlaceOrderResult,
  Quote,
} from './types';

type AlpacaCredentials = {
  keyId: string;
  secretKey: string;
  env: BrokerEnv;
};

const alpacaBaseUrl = (env: BrokerEnv) =>
  env === 'paper' ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';

const alpacaDataUrl = () => 'https://data.alpaca.markets';

const tfToAlpaca = (tf: Timeframe) => {
  switch (tf) {
    case '1m':
      return '1Min';
    case '5m':
      return '5Min';
    case '15m':
      return '15Min';
    case '1h':
      return '1Hour';
    case '1d':
      return '1Day';
  }
};

const alpacaFetch = async (url: string, creds: AlpacaCredentials, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set('APCA-API-KEY-ID', creds.keyId);
  headers.set('APCA-API-SECRET-KEY', creds.secretKey);
  headers.set('Content-Type', 'application/json');
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Alpaca HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res;
};

export const createAlpacaAdapter = (creds: AlpacaCredentials): BrokerAdapter => {
  return {
    broker: 'ALPACA',
    async validateConnection() {
      await alpacaFetch(`${alpacaBaseUrl(creds.env)}/v2/account`, creds);
    },
    async getAccountSummary(): Promise<AccountSummary> {
      const res = await alpacaFetch(`${alpacaBaseUrl(creds.env)}/v2/account`, creds);
      const data: any = await res.json();
      return {
        broker: 'ALPACA',
        equity: Number(data.equity ?? NaN),
        cash: Number(data.cash ?? NaN),
        buyingPower: Number(data.buying_power ?? NaN),
        raw: data,
      };
    },
    async getQuote(instrumentId: string): Promise<Quote> {
      // instrumentId is the US symbol for Alpaca.
      const res = await alpacaFetch(`${alpacaDataUrl()}/v2/stocks/${encodeURIComponent(instrumentId)}/quotes/latest`, creds);
      const data: any = await res.json();
      const q = data?.quote;
      return {
        instrumentId,
        last: Number(q?.ap ?? q?.bp ?? NaN),
        ts: q?.t ?? new Date().toISOString(),
        raw: data,
      } as any;
    },
    async getCandles(args): Promise<Candle[]> {
      const tf = tfToAlpaca(args.timeframe);
      const url = new URL(`${alpacaDataUrl()}/v2/stocks/${encodeURIComponent(args.instrumentId)}/bars`);
      url.searchParams.set('timeframe', tf);
      url.searchParams.set('start', args.from);
      url.searchParams.set('end', args.to);
      url.searchParams.set('limit', '1000');
      const res = await alpacaFetch(url.toString(), creds);
      const data: any = await res.json();
      const bars = Array.isArray(data?.bars) ? data.bars : [];
      return bars.map((b: any) => ({
        t: b.t,
        o: Number(b.o),
        h: Number(b.h),
        l: Number(b.l),
        c: Number(b.c),
        v: Number(b.v ?? 0),
      }));
    },
    async listOrders(args?: { status?: string; limit?: number }): Promise<BrokerOrder[]> {
      const url = new URL(`${alpacaBaseUrl(creds.env)}/v2/orders`);
      url.searchParams.set('status', args?.status ?? 'all');
      url.searchParams.set('limit', String(args?.limit ?? 200));
      const res = await alpacaFetch(url.toString(), creds);
      const data: any[] = await res.json();
      return (Array.isArray(data) ? data : []).map((o: any) => ({
        brokerOrderId: o?.id ?? '',
        instrumentId: o?.symbol,
        status: o?.status,
        raw: o,
      }));
    },
    async listPositions(): Promise<BrokerPosition[]> {
      const res = await alpacaFetch(`${alpacaBaseUrl(creds.env)}/v2/positions`, creds);
      const data: any[] = await res.json();
      return (Array.isArray(data) ? data : []).map((p: any) => ({
        instrumentId: p?.symbol ?? '',
        qty: Number(p?.qty ?? 0),
        avgPrice: Number(p?.avg_entry_price ?? NaN),
        raw: p,
      }));
    },
    async placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult> {
      const payload: any = {
        symbol: req.instrumentId,
        side: req.side.toLowerCase(),
        type: req.type.toLowerCase(),
        qty: String(req.qty),
        time_in_force: req.timeInForce ?? 'day',
      };
      if (req.type === 'LIMIT') payload.limit_price = String(req.limitPrice);
      const res = await alpacaFetch(`${alpacaBaseUrl(creds.env)}/v2/orders`, creds, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();
      return { brokerOrderId: data?.id ?? '', status: data?.status ?? 'unknown', raw: data };
    },
    async cancelOrder(brokerOrderId: string): Promise<void> {
      await alpacaFetch(`${alpacaBaseUrl(creds.env)}/v2/orders/${encodeURIComponent(brokerOrderId)}`, creds, {
        method: 'DELETE',
      });
    },
  };
};
