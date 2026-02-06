'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function InstrumentsPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [market, setMarket] = useState<'US' | 'IN' | ''>('');
  const [results, setResults] = useState<any[]>([]);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const pinned = useMemo(() => watchlists.find((w) => w.pinned) ?? watchlists[0], [watchlists]);
  const [err, setErr] = useState<string | null>(null);

  // quick manual instrument add
  const [newId, setNewId] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newMarket, setNewMarket] = useState<'US' | 'IN'>('US');
  const [newToken, setNewToken] = useState('');

  useEffect(() => {
    if (!user) return;
    void api.listWatchlists().then((r) => setWatchlists(r.watchlists)).catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <Shell title="Instruments">
        <div className="text-sm">
          Sign in first on <Link className="underline" href="/">home</Link>.
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Instruments">
      <div className="space-y-6">
        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Search</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="w-72 rounded-md border px-3 py-2 text-sm"
              placeholder="Search symbol or name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className="rounded-md border px-3 py-2 text-sm" value={market} onChange={(e) => setMarket(e.target.value as any)}>
              <option value="">All markets</option>
              <option value="US">US</option>
              <option value="IN">IN</option>
            </select>
            <button
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
              onClick={() => {
                setErr(null);
                void api
                  .searchInstruments(q, market || undefined)
                  .then((r) => setResults(r.instruments))
                  .catch((e2: any) => setErr(String(e2?.message ?? e2)));
              }}
            >
              Search
            </button>
          </div>
          <div className="space-y-2">
            {results.map((inst) => (
              <div key={inst.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <div className="text-sm">
                  <Link className="underline" href={`/instruments/${encodeURIComponent(inst.id)}`}>
                    {inst.symbol}
                  </Link>{' '}
                  <span className="text-neutral-500">
                    {inst.market} {inst.exchange ? `(${inst.exchange})` : ''}
                  </span>
                  {inst.name ? <span className="text-neutral-600"> — {inst.name}</span> : null}
                </div>
                <button
                  className="rounded-md border px-3 py-1 text-sm hover:bg-neutral-50"
                  disabled={!pinned}
                  onClick={() => {
                    if (!pinned) return;
                    setErr(null);
                    void api
                      .addWatchlistItem(pinned.id, inst.id)
                      .then(() => api.listWatchlists().then((r) => setWatchlists(r.watchlists)))
                      .catch((e2: any) => setErr(String(e2?.message ?? e2)));
                  }}
                >
                  Add to pinned watchlist
                </button>
              </div>
            ))}
            {results.length === 0 ? <div className="text-sm text-neutral-500">No results yet.</div> : null}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Manual add (dev)</h2>
          <p className="text-sm text-neutral-600">
            For US, use <span className="font-mono">id=symbol</span>. For India, use <span className="font-mono">id=NSE:INFY</span> and set <span className="font-mono">instrumentToken</span> for candles.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="id (unique)" value={newId} onChange={(e) => setNewId(e.target.value)} />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="symbol" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} />
            <select className="rounded-md border px-3 py-2 text-sm" value={newMarket} onChange={(e) => setNewMarket(e.target.value as any)}>
              <option value="US">US</option>
              <option value="IN">IN</option>
            </select>
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="instrumentToken (IN only)" value={newToken} onChange={(e) => setNewToken(e.target.value)} />
          </div>
          <button
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
            onClick={() => {
              setErr(null);
              const metadata = newMarket === 'IN' ? { instrumentToken: newToken } : {};
              void api
                .upsertInstrument({ id: newId, symbol: newSymbol, market: newMarket, metadata })
                .then(() => api.searchInstruments(newSymbol || newId, newMarket))
                .then((r) => setResults(r.instruments))
                .catch((e2: any) => setErr(String(e2?.message ?? e2)));
            }}
          >
            Upsert instrument
          </button>
        </section>
      </div>
    </Shell>
  );
}

