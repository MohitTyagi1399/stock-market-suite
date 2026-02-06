import type { Broker } from '@stock/shared';
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

type Store = {
  orderSeq: number;
  orders: BrokerOrder[];
  positions: Map<string, { qty: number; avgPrice: number }>;
};

const stores = new Map<string, Store>();

const getStore = (key: string) => {
  let store = stores.get(key);
  if (!store) {
    store = {
      orderSeq: 1,
      orders: [],
      positions: new Map(),
    };
    stores.set(key, store);
  }
  return store;
};

const seedPrice = (instrumentId: string) => {
  let hash = 0;
  for (const ch of instrumentId) hash = (hash * 31 + ch.charCodeAt(0)) % 10_000;
  return 50 + (hash % 5000) / 100;
};

export const createMockAdapter = (args: { broker: Broker; accountKey: string }): BrokerAdapter => {
  const store = getStore(`${args.broker}:${args.accountKey}`);
  return {
    broker: args.broker,
    async validateConnection() {},
    async getAccountSummary(): Promise<AccountSummary> {
      return { broker: args.broker, equity: 100_000, cash: 80_000, buyingPower: 200_000 };
    },
    async getQuote(instrumentId: string): Promise<Quote> {
      return {
        instrumentId,
        last: seedPrice(instrumentId),
        ts: new Date().toISOString(),
      };
    },
    async getCandles(input): Promise<Candle[]> {
      const from = new Date(input.from).getTime();
      const to = new Date(input.to).getTime();
      const step = input.timeframe === '1d' ? 86_400_000 : input.timeframe === '1h' ? 3_600_000 : 900_000;
      const out: Candle[] = [];
      const base = seedPrice(input.instrumentId);
      for (let t = from; t <= to && out.length < 1000; t += step) {
        const drift = Math.sin(t / 10_000_000) * 2;
        const o = base + drift;
        const c = o + Math.sin(t / 3_000_000) * 1.5;
        const h = Math.max(o, c) + 0.8;
        const l = Math.min(o, c) - 0.8;
        out.push({
          t: new Date(t).toISOString(),
          o,
          h,
          l,
          c,
          v: 1_000 + Math.floor(Math.abs(Math.sin(t / 1_000_000)) * 1_000),
        });
      }
      return out;
    },
    async listOrders(): Promise<BrokerOrder[]> {
      return [...store.orders];
    },
    async listPositions(): Promise<BrokerPosition[]> {
      return [...store.positions.entries()].map(([instrumentId, p]) => ({
        instrumentId,
        qty: p.qty,
        avgPrice: p.avgPrice,
      }));
    },
    async placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult> {
      const brokerOrderId = `${args.broker.toLowerCase()}-mock-${store.orderSeq++}`;
      const status = 'filled';
      store.orders.unshift({
        brokerOrderId,
        instrumentId: req.instrumentId,
        status,
        raw: req,
      });

      const price = req.limitPrice ?? seedPrice(req.instrumentId);
      const current = store.positions.get(req.instrumentId) ?? { qty: 0, avgPrice: price };
      const signedQty = req.side === 'BUY' ? req.qty : -req.qty;
      const nextQty = current.qty + signedQty;
      if (nextQty === 0) {
        store.positions.delete(req.instrumentId);
      } else {
        const nextAvg =
          signedQty > 0
            ? (current.avgPrice * current.qty + price * req.qty) / Math.max(current.qty + req.qty, 1)
            : current.avgPrice;
        store.positions.set(req.instrumentId, { qty: nextQty, avgPrice: nextAvg });
      }

      return { brokerOrderId, status, raw: req };
    },
    async cancelOrder() {},
  };
};

