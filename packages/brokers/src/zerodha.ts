import type { Timeframe } from '@stock/shared';
import type {
  AccountSummary,
  BrokerAdapter,
  BrokerOrder,
  BrokerPosition,
  Candle,
  PlaceOrderRequest,
  PlaceOrderResult,
  Quote,
} from './types';

type ZerodhaCredentials = {
  apiKey: string;
  accessToken: string;
};

const kiteBaseUrl = () => 'https://api.kite.trade';

const tfToKiteInterval = (tf: Timeframe) => {
  switch (tf) {
    case '1m':
      return 'minute';
    case '5m':
      return '5minute';
    case '15m':
      return '15minute';
    case '1h':
      return '60minute';
    case '1d':
      return 'day';
  }
};

const kiteFetch = async (url: string, creds: ZerodhaCredentials, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set('X-Kite-Version', '3');
  headers.set('Authorization', `token ${creds.apiKey}:${creds.accessToken}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Zerodha HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res;
};

export const createZerodhaAdapter = (creds: ZerodhaCredentials): BrokerAdapter => {
  return {
    broker: 'ZERODHA',
    async validateConnection() {
      await kiteFetch(`${kiteBaseUrl()}/user/profile`, creds);
    },
    async getAccountSummary(): Promise<AccountSummary> {
      const res = await kiteFetch(`${kiteBaseUrl()}/user/margins`, creds);
      const data: any = await res.json();
      return { broker: 'ZERODHA', raw: data };
    },
    async getQuote(instrumentId: string): Promise<Quote> {
      // instrumentId expected to be tradingsymbol for v1; full "NSE:INFY" style recommended.
      const url = new URL(`${kiteBaseUrl()}/quote/ltp`);
      url.searchParams.set('i', instrumentId);
      const res = await kiteFetch(url.toString(), creds);
      const data: any = await res.json();
      const key = Object.keys(data?.data ?? {})[0];
      const ltp = key ? data.data[key]?.last_price : undefined;
      return {
        instrumentId,
        last: Number(ltp ?? NaN),
        ts: new Date().toISOString(),
        raw: data,
      } as any;
    },
    async getCandles(args): Promise<Candle[]> {
      // Zerodha historical requires instrument_token; for v1 we expect instrumentId to be instrument_token string.
      const interval = tfToKiteInterval(args.timeframe);
      const url = new URL(`${kiteBaseUrl()}/instruments/historical/${encodeURIComponent(args.instrumentId)}/${interval}`);
      url.searchParams.set('from', args.from);
      url.searchParams.set('to', args.to);
      const res = await kiteFetch(url.toString(), creds);
      const data: any = await res.json();
      const candles = data?.data?.candles ?? [];
      return candles.map((c: any[]) => ({
        t: c[0],
        o: Number(c[1]),
        h: Number(c[2]),
        l: Number(c[3]),
        c: Number(c[4]),
        v: Number(c[5] ?? 0),
      }));
    },
    async listOrders(): Promise<BrokerOrder[]> {
      const res = await kiteFetch(`${kiteBaseUrl()}/orders`, creds);
      const data: any = await res.json();
      const orders = data?.data ?? [];
      return (Array.isArray(orders) ? orders : []).map((o: any) => ({
        brokerOrderId: o?.order_id ?? '',
        instrumentId: o?.exchange && o?.tradingsymbol ? `${o.exchange}:${o.tradingsymbol}` : undefined,
        status: o?.status,
        raw: o,
      }));
    },
    async listPositions(): Promise<BrokerPosition[]> {
      const res = await kiteFetch(`${kiteBaseUrl()}/portfolio/positions`, creds);
      const data: any = await res.json();
      const positions = data?.data?.net ?? [];
      return (Array.isArray(positions) ? positions : []).map((p: any) => ({
        instrumentId:
          p?.exchange && p?.tradingsymbol ? `${p.exchange}:${p.tradingsymbol}` : String(p?.instrument_token ?? ''),
        qty: Number(p?.quantity ?? 0),
        avgPrice: Number(p?.average_price ?? NaN),
        raw: p,
      }));
    },
    async placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult> {
      // For v1 we keep it minimal; order placement needs exchange/tradingsymbol, etc.
      // Expect instrumentId to be like "NSE:INFY" (or "NSE:RELIANCE"). We'll split it.
      const [exchange, tradingsymbol] = req.instrumentId.includes(':')
        ? (req.instrumentId.split(':', 2) as [string, string])
        : (['NSE', req.instrumentId] as [string, string]);
      const payload: any = {
        exchange,
        tradingsymbol,
        transaction_type: req.side,
        order_type: req.type,
        quantity: Math.floor(req.qty),
        product: 'CNC',
        validity: 'DAY',
      };
      if (req.type === 'LIMIT') payload.price = req.limitPrice;
      const res = await kiteFetch(`${kiteBaseUrl()}/orders/regular`, creds, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();
      return { brokerOrderId: data?.data?.order_id ?? '', status: data?.status ?? 'unknown', raw: data };
    },
    async cancelOrder(brokerOrderId: string): Promise<void> {
      await kiteFetch(`${kiteBaseUrl()}/orders/regular/${encodeURIComponent(brokerOrderId)}`, creds, {
        method: 'DELETE',
      });
    },
  };
};
