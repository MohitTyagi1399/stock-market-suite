import { z } from 'zod';

export const marketSchema = z.enum(['US', 'IN']);
export const brokerSchema = z.enum(['ALPACA', 'ZERODHA']);
export const timeframeSchema = z.enum(['1m', '5m', '15m', '1h', '1d']);
export const orderSideSchema = z.enum(['BUY', 'SELL']);
export const orderTypeSchema = z.enum(['MARKET', 'LIMIT']);

export const emailSchema = z.string().email().max(254);
export const passwordSchema = z.string().min(8).max(200);

export const instrumentIdSchema = z.string().min(1).max(80);

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = createUserSchema;

export const createWatchlistSchema = z.object({
  name: z.string().min(1).max(60),
});

export const addWatchlistItemSchema = z.object({
  instrumentId: instrumentIdSchema,
});

export const placeOrderSchema = z.object({
  broker: brokerSchema,
  instrumentId: instrumentIdSchema,
  side: orderSideSchema,
  type: orderTypeSchema,
  qty: z.number().positive(),
  limitPrice: z.number().positive().optional(),
});

export const candlesQuerySchema = z.object({
  timeframe: timeframeSchema,
  from: z.string().datetime(),
  to: z.string().datetime(),
});

