'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Shell } from '../../components/Shell';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    api
      .listOrders()
      .then((r) => setOrders(r.orders))
      .catch((e2: any) => setErr(String(e2?.message ?? e2)));

  useEffect(() => {
    if (!user) return;
    setErr(null);
    void load();
  }, [user]);

  if (!user) {
    return (
      <Shell title="Orders">
        <div className="text-sm">
          Sign in first on <Link className="underline" href="/">home</Link>.
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Orders">
      <div className="space-y-3">
        {err ? <div className="text-sm text-red-600">{err}</div> : null}
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => void load()}>
            Refresh
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
            onClick={() => {
              setErr(null);
              void api
                .syncOrders()
                .then(() => load())
                .catch((e2: any) => setErr(String(e2?.message ?? e2)));
            }}
          >
            Sync from brokers
          </button>
        </div>

        <div className="overflow-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">Instrument</th>
                <th className="p-2">Broker</th>
                <th className="p-2">Side</th>
                <th className="p-2">Type</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2 text-xs text-neutral-600">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="p-2">
                    <Link className="underline" href={`/instruments/${encodeURIComponent(o.instrument.id)}`}>
                      {o.instrument.symbol}
                    </Link>
                  </td>
                  <td className="p-2">{o.broker}</td>
                  <td className="p-2">{o.side}</td>
                  <td className="p-2">{o.type}</td>
                  <td className="p-2 tabular-nums">{o.qty}</td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2">
                    {o.status !== 'CANCELED' && o.status !== 'FILLED' ? (
                      <button
                        className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50"
                        onClick={() => {
                          setErr(null);
                          void api
                            .cancelOrder(o.id)
                            .then(() => load())
                            .catch((e2: any) => setErr(String(e2?.message ?? e2)));
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td className="p-3 text-neutral-500" colSpan={8}>
                    No orders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

