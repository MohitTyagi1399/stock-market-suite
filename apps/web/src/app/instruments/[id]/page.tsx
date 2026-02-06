'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Shell } from '../../../components/Shell';
import { CandleChart } from '../../../components/CandleChart';
import { RsiChart } from '../../../components/RsiChart';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { ema, rsi as rsiFn, sma, vwap as vwapFn } from '@stock/shared';

const timeframes = ['1m', '5m', '15m', '1h', '1d'] as const;

export default function InstrumentPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(String(params.id ?? ''));
  const [instrument, setInstrument] = useState<any | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [tf, setTf] = useState<(typeof timeframes)[number]>('15m');
  const [err, setErr] = useState<string | null>(null);

  const [showSma, setShowSma] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showVwap, setShowVwap] = useState(false);
  const [showRsi, setShowRsi] = useState(true);

  // order ticket
  const [broker, setBroker] = useState<'ALPACA' | 'ZERODHA'>('ALPACA');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [qty, setQty] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');

  const fromTo = useMemo(() => {
    const to = new Date();
    const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [tf]);

  useEffect(() => {
    if (!user) return;
    setErr(null);
    void api
      .getInstrument(id)
      .then((r) => setInstrument(r.instrument))
      .catch((e2: any) => setErr(String(e2?.message ?? e2)));
  }, [user, id]);

  useEffect(() => {
    if (!user) return;
    setErr(null);
    void api
      .getCandles(id, { timeframe: tf, ...fromTo })
      .then((r) => setCandles(r.candles))
      .catch((e2: any) => setErr(String(e2?.message ?? e2)));
  }, [user, id, tf, fromTo.from, fromTo.to]);

  useEffect(() => {
    if (!instrument) return;
    setBroker(instrument.market === 'US' ? 'ALPACA' : 'ZERODHA');
  }, [instrument]);

  const closes = useMemo(() => candles.map((c) => Number(c.c)), [candles]);
  const times = useMemo(() => candles.map((c) => String(c.t)), [candles]);
  const sma20 = useMemo(() => (showSma ? sma(closes, 20) : undefined), [closes, showSma]);
  const ema20 = useMemo(() => (showEma ? ema(closes, 20) : undefined), [closes, showEma]);
  const vw = useMemo(() => (showVwap ? vwapFn(candles as any) : undefined), [candles, showVwap]);
  const rsi14 = useMemo(() => (showRsi ? rsiFn(closes, 14) : undefined), [closes, showRsi]);

  if (!user) {
    return (
      <Shell title="Instrument">
        <div className="text-sm">
          Sign in first on <Link className="underline" href="/">home</Link>.
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Instrument">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-neutral-600">Instrument</div>
            <div className="text-xl font-semibold">{instrument ? instrument.symbol : id}</div>
            {instrument ? (
              <div className="text-sm text-neutral-600">
                {instrument.market} {instrument.exchange ? `(${instrument.exchange})` : ''} {instrument.name ? `— ${instrument.name}` : ''}
              </div>
            ) : null}
          </div>
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50" href="/instruments">
            Back to search
          </Link>
        </div>

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <div className="flex flex-wrap gap-2">
          {timeframes.map((t) => (
            <button
              key={t}
              className={`rounded-md border px-3 py-1 text-sm ${tf === t ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}
              onClick={() => setTf(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showSma} onChange={(e) => setShowSma(e.target.checked)} /> SMA(20)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showEma} onChange={(e) => setShowEma(e.target.checked)} /> EMA(20)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showVwap} onChange={(e) => setShowVwap(e.target.checked)} /> VWAP
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showRsi} onChange={(e) => setShowRsi(e.target.checked)} /> RSI(14)
          </label>
        </div>

        <CandleChart candles={candles} overlays={{ sma20, ema20, vwap: vw }} />
        {rsi14 ? <RsiChart times={times} rsi={rsi14} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="font-medium">Order ticket</div>
            <div className="mt-3 grid gap-2">
              <label className="text-sm">
                Broker
                <select className="mt-1 w-full rounded-md border px-3 py-2" value={broker} onChange={(e) => setBroker(e.target.value as any)}>
                  <option value="ALPACA">Alpaca (US)</option>
                  <option value="ZERODHA">Zerodha (IN)</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  Side
                  <select className="mt-1 w-full rounded-md border px-3 py-2" value={side} onChange={(e) => setSide(e.target.value as any)}>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </label>
                <label className="text-sm">
                  Type
                  <select className="mt-1 w-full rounded-md border px-3 py-2" value={type} onChange={(e) => setType(e.target.value as any)}>
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                  </select>
                </label>
              </div>
              <label className="text-sm">
                Quantity
                <input className="mt-1 w-full rounded-md border px-3 py-2" value={qty} onChange={(e) => setQty(e.target.value)} />
              </label>
              {type === 'LIMIT' ? (
                <label className="text-sm">
                  Limit price
                  <input className="mt-1 w-full rounded-md border px-3 py-2" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
                </label>
              ) : null}
              <button
                className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
                onClick={() => {
                  setErr(null);
                  void api
                    .placeOrder({
                      broker,
                      instrumentId: id,
                      side,
                      type,
                      qty: Number(qty),
                      limitPrice: limitPrice ? Number(limitPrice) : undefined,
                    })
                    .then(() => alert('Order submitted'))
                    .catch((e2: any) => setErr(String(e2?.message ?? e2)));
                }}
              >
                Place order
              </button>
              <div className="text-xs text-neutral-500">
                Demo MVP. Make sure broker is connected in <Link className="underline" href="/settings/brokers">Brokers</Link>.
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="font-medium">Quote</div>
            <QuoteBox instrumentId={id} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

const QuoteBox = ({ instrumentId }: { instrumentId: string }) => {
  const [quote, setQuote] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setErr(null);
    void api
      .getQuote(instrumentId)
      .then((r) => setQuote(r.quote))
      .catch((e2: any) => setErr(String(e2?.message ?? e2)));
  }, [instrumentId]);
  if (err) return <div className="mt-2 text-sm text-red-600">{err}</div>;
  if (!quote) return <div className="mt-2 text-sm text-neutral-500">Loading…</div>;
  return (
    <div className="mt-2 space-y-1">
      <div className="text-2xl font-semibold tabular-nums">{Number(quote.last).toFixed(2)}</div>
      <div className="text-xs text-neutral-500">{quote.ts}</div>
    </div>
  );
};
