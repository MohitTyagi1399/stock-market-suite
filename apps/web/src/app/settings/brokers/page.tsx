'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Shell } from '../../../components/Shell';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

export default function BrokersPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [alpacaKeyId, setAlpacaKeyId] = useState('');
  const [alpacaSecret, setAlpacaSecret] = useState('');
  const [alpacaEnv, setAlpacaEnv] = useState<'paper' | 'live'>('paper');

  const [kiteApiKey, setKiteApiKey] = useState('');
  const [kiteAccessToken, setKiteAccessToken] = useState('');

  const load = () =>
    api
      .listBrokers()
      .then((r) => setConnections(r.connections))
      .catch((e2: any) => setErr(String(e2?.message ?? e2)));

  useEffect(() => {
    if (!user) return;
    setErr(null);
    void load();
  }, [user]);

  if (!user) {
    return (
      <Shell title="Brokers">
        <div className="text-sm">
          Sign in first on <Link className="underline" href="/">home</Link>.
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Brokers">
      <div className="space-y-6">
        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Connected</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {connections.map((c) => (
              <div key={c.broker} className="rounded-lg border p-3">
                <div className="font-medium">{c.broker}</div>
                <div className="text-sm text-neutral-600">{c.status}</div>
                <div className="text-xs text-neutral-500">Updated {new Date(c.updatedAt).toLocaleString()}</div>
              </div>
            ))}
            {connections.length === 0 ? <div className="text-sm text-neutral-500">No brokers connected.</div> : null}
          </div>
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => void load()}>
            Refresh
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Connect Alpaca (US)</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Key ID" value={alpacaKeyId} onChange={(e) => setAlpacaKeyId(e.target.value)} />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Secret Key" value={alpacaSecret} onChange={(e) => setAlpacaSecret(e.target.value)} />
            <select className="rounded-md border px-3 py-2 text-sm" value={alpacaEnv} onChange={(e) => setAlpacaEnv(e.target.value as any)}>
              <option value="paper">paper</option>
              <option value="live">live</option>
            </select>
          </div>
          <button
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
            onClick={() => {
              setErr(null);
              void api
                .connectAlpaca({ keyId: alpacaKeyId, secretKey: alpacaSecret, env: alpacaEnv })
                .then(() => load())
                .catch((e2: any) => setErr(String(e2?.message ?? e2)));
            }}
          >
            Connect Alpaca
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Connect Zerodha Kite (India)</h2>
          <p className="text-sm text-neutral-600">
            For this MVP, paste your <span className="font-mono">apiKey</span> and <span className="font-mono">accessToken</span>.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="API Key" value={kiteApiKey} onChange={(e) => setKiteApiKey(e.target.value)} />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Access Token" value={kiteAccessToken} onChange={(e) => setKiteAccessToken(e.target.value)} />
          </div>
          <button
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
            onClick={() => {
              setErr(null);
              void api
                .connectZerodha({ apiKey: kiteApiKey, accessToken: kiteAccessToken })
                .then(() => load())
                .catch((e2: any) => setErr(String(e2?.message ?? e2)));
            }}
          >
            Connect Zerodha
          </button>
        </section>
      </div>
    </Shell>
  );
}

