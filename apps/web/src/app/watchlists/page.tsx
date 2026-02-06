'use client';

import { io, type Socket } from 'socket.io-client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { API_BASE_URL } from '../../lib/env';
import { useAuth } from '../../lib/auth';

type Quote = { instrumentId: string; last: number; ts: string };

export default function WatchlistsPage() {
  const { user } = useAuth();
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [err, setErr] = useState<string | null>(null);

  const pinned = useMemo(() => watchlists.find((w) => w.pinned) ?? watchlists[0], [watchlists]);
  const instrumentIds = useMemo(() => {
    const items = pinned?.items ?? [];
    return items.map((it: any) => it.instrument.id);
  }, [pinned]);

  useEffect(() => {
    if (!user) return;
    void api
      .listWatchlists()
      .then((r) => setWatchlists(r.watchlists))
      .catch((e: any) => setErr(String(e?.message ?? e)));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (instrumentIds.length === 0) return;
    let socket: Socket | null = null;
    let stopped = false;

    const start = async () => {
      socket = io(API_BASE_URL, { path: '/ws', transports: ['websocket'] });
      socket.on('connect', async () => {
        if (stopped) return;
        socket?.emit('subscribe', { accessToken: api.getAccessToken(), instrumentIds });
      });
      socket.on('quotes', (payload: Quote[]) => {
        setQuotes((prev) => {
          const next = { ...prev };
          for (const q of payload) next[q.instrumentId] = q;
          return next;
        });
      });
    };
    void start();

    return () => {
      stopped = true;
      socket?.disconnect();
    };
  }, [user, instrumentIds.join('|')]);

  if (!user) {
    return (
      <Shell title="Watchlists">
        <div className="text-sm">
          Sign in first on <Link className="underline" href="/">home</Link>.
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Watchlists">
      <div className="space-y-4">
        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            void api
              .createWatchlist(name)
              .then(() => api.listWatchlists().then((r) => setWatchlists(r.watchlists)))
              .then(() => setName(''))
              .catch((e2: any) => setErr(String(e2?.message ?? e2)));
          }}
        >
          <input
            className="w-72 rounded-md border px-3 py-2 text-sm"
            placeholder="New watchlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white">Create</button>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          {watchlists.map((wl) => (
            <div key={wl.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {wl.name} {wl.pinned ? <span className="text-xs text-neutral-500">(pinned)</span> : null}
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {(wl.items ?? []).map((it: any) => {
                  const inst = it.instrument;
                  const q = quotes[inst.id];
                  return (
                    <div key={inst.id} className="flex items-center justify-between gap-2">
                      <Link className="underline text-sm" href={`/instruments/${encodeURIComponent(inst.id)}`}>
                        {inst.symbol} <span className="text-neutral-500">{inst.market}</span>
                      </Link>
                      <div className="text-sm tabular-nums">{q ? q.last.toFixed(2) : '—'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

