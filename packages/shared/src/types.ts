export type Market = 'US' | 'IN';
export type Broker = 'ALPACA' | 'ZERODHA';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '1d';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'REJECTED';

