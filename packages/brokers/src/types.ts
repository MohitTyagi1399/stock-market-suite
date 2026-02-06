import type { Broker, OrderSide, OrderType, Timeframe } from '@stock/shared';

export type BrokerEnv = 'paper' | 'live';

export type Quote = {
  instrumentId: string;
  last: number;
  change?: number;
  changePct?: number;
  ts: string;
};

export type Candle = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type PlaceOrderRequest = {
  instrumentId: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  limitPrice?: number;
  timeInForce?: 'day' | 'gtc';
};

export type PlaceOrderResult = {
  brokerOrderId: string;
  status: string;
  raw?: unknown;
};

export type AccountSummary = {
  broker: Broker;
  equity?: number;
  cash?: number;
  buyingPower?: number;
  raw?: unknown;
};

export type BrokerOrder = {
  brokerOrderId: string;
  instrumentId?: string;
  status?: string;
  raw?: unknown;
};

export type BrokerPosition = {
  instrumentId: string;
  qty: number;
  avgPrice?: number;
  raw?: unknown;
};

export interface BrokerAdapter {
  broker: Broker;
  validateConnection(): Promise<void>;
  getAccountSummary(): Promise<AccountSummary>;
  getQuote(instrumentId: string): Promise<Quote>;
  getCandles(args: {
    instrumentId: string;
    timeframe: Timeframe;
    from: string;
    to: string;
  }): Promise<Candle[]>;
  listOrders(args?: { status?: string; limit?: number }): Promise<BrokerOrder[]>;
  listPositions(): Promise<BrokerPosition[]>;
  placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult>;
  cancelOrder(brokerOrderId: string): Promise<void>;
}
