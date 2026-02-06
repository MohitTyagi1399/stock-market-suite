'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-100 hover:bg-white/10'
      }`}
      href={href}
    >
      {label}
    </Link>
  );
};

export const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-black/25 p-4 backdrop-blur">
          <div>
            <Link href="/" className="text-xl font-semibold text-white">
              Nebula Trade Desk
            </Link>
            <div className="text-sm text-emerald-100/90">{title}</div>
          </div>
          <div className="flex items-center gap-3">
            {user ? <div className="text-sm text-emerald-100">{user.email}</div> : null}
            {user ? (
              <button
                className="rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </header>
        <nav className="flex flex-wrap gap-2 rounded-xl border border-emerald-300/20 bg-black/20 p-2 backdrop-blur">
          <NavLink href="/watchlists" label="Watchlists" />
          <NavLink href="/instruments" label="Instruments" />
          <NavLink href="/orders" label="Orders" />
          <NavLink href="/portfolio" label="Portfolio" />
          <NavLink href="/settings/brokers" label="Brokers" />
          <NavLink href="/settings/security" label="Security" />
        </nav>
        <main className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xl">{children}</main>
      </div>
    </div>
  );
};
