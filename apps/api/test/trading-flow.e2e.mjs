import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = Number(process.env.E2E_PORT || 3101);
const BASE = `http://127.0.0.1:${PORT}`;
const shouldRun = Boolean(process.env.DATABASE_URL);

let child;
let accessToken = '';

const req = async (path, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}: ${data?.message || res.statusText}`);
  }
  return data;
};

before(async () => {
  if (!shouldRun) return;
  await cleanupDb();

  child = spawn('node', ['dist/main.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: {
      ...process.env,
      PORT: String(PORT),
      COOKIE_SECURE: 'false',
      BROKER_SANDBOX_MODE: 'true',
      ALERT_EVAL_INTERVAL_MS: '300000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const health = await fetch(`${BASE}/health`);
      if (health.ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(250);
  }
  if (!ready) throw new Error('API failed to start for e2e');
});

after(async () => {
  if (!shouldRun) return;
  if (child && !child.killed) child.kill('SIGTERM');
  await cleanupDb();
  await prisma.$disconnect();
});

test(
  'main trading flow',
  { skip: shouldRun ? false : 'DATABASE_URL is not set for e2e tests' },
  async () => {
  const signup = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: 'e2e@example.com', password: 'VeryStrongPass123!' }),
  });
  assert.ok(signup.accessToken);
  accessToken = signup.accessToken;

  const brokerConnect = await req('/brokers/alpaca/connect', {
    method: 'POST',
    body: JSON.stringify({ keyId: 'mock', secretKey: 'mock', env: 'paper' }),
  });
  assert.equal(brokerConnect.ok, true);

  const upsertInstrument = await req('/instruments/upsert', {
    method: 'POST',
    body: JSON.stringify({ id: 'AAPL', symbol: 'AAPL', market: 'US', exchange: 'NASDAQ', name: 'Apple Inc' }),
  });
  assert.equal(upsertInstrument.instrument.id, 'AAPL');

  const watchlist = await req('/watchlists', {
    method: 'POST',
    body: JSON.stringify({ name: 'Main' }),
  });
  assert.ok(watchlist.watchlist.id);

  const addItem = await req(`/watchlists/${watchlist.watchlist.id}/items`, {
    method: 'POST',
    body: JSON.stringify({ instrumentId: 'AAPL' }),
  });
  assert.equal(addItem.ok, true);

  const now = Date.now();
  const from = new Date(now - 1000 * 60 * 60 * 24).toISOString();
  const to = new Date(now).toISOString();
  const candles = await req(`/market/AAPL/candles?timeframe=15m&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  assert.ok(candles.candles.length > 0);

  const order = await req('/orders', {
    method: 'POST',
    body: JSON.stringify({
      broker: 'ALPACA',
      instrumentId: 'AAPL',
      side: 'BUY',
      type: 'MARKET',
      qty: 2,
    }),
  });
  assert.ok(order.order.id);

  const synced = await req('/orders/sync', { method: 'POST' });
  assert.ok(Array.isArray(synced.updated));

  const orders = await req('/orders');
  assert.ok(orders.orders.length >= 1);

  const positions = await req('/portfolio/positions');
  assert.ok(positions.positions.length >= 1);

  const alert = await req('/alerts', {
    method: 'POST',
    body: JSON.stringify({
      instrumentId: 'AAPL',
      type: 'PRICE_ABOVE',
      params: { threshold: 0.5 },
    }),
  });
  assert.ok(alert.rule.id);

  await req('/alerts/evaluate-now', { method: 'POST' });

  let inboxCount = 0;
  for (let i = 0; i < 20; i++) {
    const inbox = await req('/notifications/inbox?limit=20');
    inboxCount = inbox.events.length;
    if (inboxCount > 0) break;
    await sleep(200);
  }
  assert.ok(inboxCount > 0);
  },
);

async function cleanupDb() {
  await prisma.notificationDevice.deleteMany();
  await prisma.alertEvent.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.position.deleteMany();
  await prisma.order.deleteMany();
  await prisma.candle.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.accountSnapshot.deleteMany();
  await prisma.brokerConnection.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}
