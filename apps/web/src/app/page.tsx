'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';

const Nav = () => (
  <nav className="flex flex-wrap gap-2 text-sm">
    <Link className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800" href="/watchlists">
      Watchlists
    </Link>
    <Link className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800" href="/instruments">
      Instruments
    </Link>
    <Link className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800" href="/orders">
      Orders
    </Link>
    <Link className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800" href="/portfolio">
      Portfolio
    </Link>
    <Link className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800" href="/settings/brokers">
      Brokers
    </Link>
    <Link className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800" href="/settings/security">
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

  if (!ready) return <div className="p-8 text-slate-900">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-emerald-300/20 bg-black/35 p-4 backdrop-blur md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-200">
                NEBULA TRADE DESK
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Unified Market Intelligence Terminal</h1>
              <p className="mt-1 text-sm text-emerald-100/90">US + India analysis, broker connectivity, and execution in one workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/watchlists" className="rounded-md border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10">
                Open Dashboard
              </Link>
              {user ? (
                <button
                  className="rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {user ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200/70 bg-white p-5 shadow-lg">
              <div className="text-sm text-slate-700">Signed in as</div>
              <div className="font-semibold text-slate-950">{user.email}</div>
              <div className="text-sm text-slate-600">MFA: {user.mfaEnabled ? 'enabled' : 'disabled'}</div>
            </div>
            <div className="rounded-xl border border-emerald-200/70 bg-white p-5 shadow-lg">
              <Nav />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
            <section className="rounded-2xl border border-emerald-300/25 bg-black/30 p-6 text-white backdrop-blur">
              <h2 className="text-xl font-semibold">Trade with clarity</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-100/90">
                Nebula Trade Desk is built for precision: deep charts, fast watchlists, and seamless order workflows with enterprise-grade security.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-300/25 bg-emerald-500/10 p-3">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">Markets</div>
                  <div className="mt-1 text-lg font-semibold">US + India</div>
                </div>
                <div className="rounded-lg border border-emerald-300/25 bg-emerald-500/10 p-3">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">Execution</div>
                  <div className="mt-1 text-lg font-semibold">Live + Sandbox</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-200/70 bg-white p-5 shadow-xl">
            <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
              <button
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  mode === 'signin' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:bg-white'
                }`}
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
              <button
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  mode === 'signup' ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:bg-white'
                }`}
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
                <div className="text-sm font-medium text-slate-800">Email</div>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="text-sm font-medium text-slate-800">Password</div>
                <input
                  type="password"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {mode === 'signin' ? (
                <label className="block">
                  <div className="text-sm font-medium text-slate-800">MFA code (if enabled)</div>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                  />
                </label>
              ) : null}
              {err ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div> : null}
              <button className="w-full rounded-md bg-emerald-500 px-3 py-2 font-semibold text-slate-950 hover:bg-emerald-400">{buttonLabel}</button>
            </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
