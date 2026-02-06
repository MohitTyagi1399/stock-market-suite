'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';

const Nav = () => (
  <nav className="flex flex-wrap gap-3 text-sm">
    <Link className="underline" href="/watchlists">
      Watchlists
    </Link>
    <Link className="underline" href="/instruments">
      Instruments
    </Link>
    <Link className="underline" href="/orders">
      Orders
    </Link>
    <Link className="underline" href="/portfolio">
      Portfolio
    </Link>
    <Link className="underline" href="/settings/brokers">
      Brokers
    </Link>
    <Link className="underline" href="/settings/security">
      Security
    </Link>
  </nav>
);

export default function Home() {
  const { ready, user, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const buttonLabel = useMemo(() => (mode === 'signin' ? 'Sign in' : 'Create account'), [mode]);

  if (!ready) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Stock Market Suite</h1>
            <p className="text-sm text-neutral-600">Analysis + live trading (Alpaca US, Zerodha India)</p>
          </div>
          {user ? (
            <button
              className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          ) : null}
        </header>

        {user ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="text-sm text-neutral-700">Signed in as</div>
              <div className="font-medium">{user.email}</div>
              <div className="text-sm text-neutral-600">MFA: {user.mfaEnabled ? 'enabled' : 'disabled'}</div>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <Nav />
            </div>
          </div>
        ) : (
          <div className="max-w-md rounded-lg border bg-white p-4">
            <div className="mb-4 flex gap-2">
              <button
                className={`rounded-md border px-3 py-1 text-sm ${mode === 'signin' ? 'bg-neutral-900 text-white' : 'bg-white'}`}
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
              <button
                className={`rounded-md border px-3 py-1 text-sm ${mode === 'signup' ? 'bg-neutral-900 text-white' : 'bg-white'}`}
                onClick={() => setMode('signup')}
              >
                Sign up
              </button>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setErr(null);
                const fn = async () => {
                  if (mode === 'signin') await signIn(email, password, mfaCode || undefined);
                  else await signUp(email, password);
                };
                void fn().catch((e2: any) => setErr(String(e2?.message ?? e2)));
              }}
            >
              <label className="block">
                <div className="text-sm">Email</div>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="text-sm">Password</div>
                <input
                  type="password"
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {mode === 'signin' ? (
                <label className="block">
                  <div className="text-sm">MFA code (if enabled)</div>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                  />
                </label>
              ) : null}
              {err ? <div className="text-sm text-red-600">{err}</div> : null}
              <button className="w-full rounded-md bg-neutral-900 px-3 py-2 text-white">{buttonLabel}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
