'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function PortfolioPage() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const s = await api.portfolioSummary();
    const p = await api.portfolioPositions();
    setSummaries((s as any).summaries ?? (s as any).summaries ?? []);
    setPositions((p as any).positions ?? []);
  };

  useEffect(() => {
    if (!user) return;
    setErr(null);
    void load().catch((e2: any) => setErr(String(e2?.message ?? e2)));
  }, [user]);

  if (!user) {
    return (
      <Shell title="Portfolio">
        <div className="text-sm">
          Sign in first on <Link className="underline" href="/">home</Link>.
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Portfolio">
      <div className="space-y-4">
        {err ? <div className="text-sm text-red-600">{err}</div> : null}
        <div className="flex gap-2">
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => void load().catch(() => {})}>
            Refresh
          </button>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Account summary</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {summaries.map((s) => (
              <div key={s.broker} className="rounded-lg border p-3">
                <div className="font-medium">{s.broker}</div>
                <div className="mt-1 text-sm text-neutral-700">
                  Equity: <span className="tabular-nums">{Number(s.equity ?? NaN).toFixed(2)}</span>
                </div>
                <div className="text-sm text-neutral-700">
                  Cash: <span className="tabular-nums">{Number(s.cash ?? NaN).toFixed(2)}</span>
                </div>
                <div className="text-sm text-neutral-700">
                  Buying power: <span className="tabular-nums">{Number(s.buyingPower ?? NaN).toFixed(2)}</span>
                </div>
              </div>
            ))}
            {summaries.length === 0 ? <div className="text-sm text-neutral-500">No broker connected.</div> : null}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Positions</h2>
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left">
                <tr>
                  <th className="p-2">Broker</th>
                  <th className="p-2">Instrument</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Avg</th>
                  <th className="p-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={`${p.broker}-${p.instrument.id}`} className="border-t">
                    <td className="p-2">{p.broker}</td>
                    <td className="p-2">
                      <Link className="underline" href={`/instruments/${encodeURIComponent(p.instrument.id)}`}>
                        {p.instrument.symbol}
                      </Link>
                    </td>
                    <td className="p-2 tabular-nums">{p.qty}</td>
                    <td className="p-2 tabular-nums">{p.avgPrice ? Number(p.avgPrice).toFixed(2) : '—'}</td>
                    <td className="p-2 text-xs text-neutral-600">{new Date(p.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {positions.length === 0 ? (
                  <tr>
                    <td className="p-3 text-neutral-500" colSpan={5}>
                      No positions yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Shell>
  );
}

