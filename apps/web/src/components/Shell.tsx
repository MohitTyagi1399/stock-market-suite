'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className={`rounded-md px-3 py-2 text-sm ${active ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`} href={href}>
      {label}
    </Link>
  );
};

export const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-xl font-semibold">
              Stock Market Suite
            </Link>
            <div className="text-sm text-neutral-600">{title}</div>
          </div>
          <div className="flex items-center gap-3">
            {user ? <div className="text-sm text-neutral-700">{user.email}</div> : null}
            {user ? (
              <button className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => void signOut()}>
                Sign out
              </button>
            ) : null}
          </div>
        </header>
        <nav className="flex flex-wrap gap-2 rounded-lg border bg-white p-2">
          <NavLink href="/watchlists" label="Watchlists" />
          <NavLink href="/instruments" label="Instruments" />
          <NavLink href="/orders" label="Orders" />
          <NavLink href="/portfolio" label="Portfolio" />
          <NavLink href="/settings/brokers" label="Brokers" />
          <NavLink href="/settings/security" label="Security" />
        </nav>
        <main className="rounded-lg border bg-white p-4">{children}</main>
      </div>
    </div>
  );
};

