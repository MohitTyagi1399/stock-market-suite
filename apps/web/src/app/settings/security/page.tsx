'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Shell } from '../../../components/Shell';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

export default function SecurityPage() {
  const { user, refresh } = useAuth();
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSetup(null);
    setRecoveryCodes(null);
  }, [user?.mfaEnabled]);

  if (!user) {
    return (
      <Shell title="Security">
        <div className="text-sm">
          Sign in first on <Link className="underline" href="/">home</Link>.
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Security">
      <div className="space-y-4">
        {err ? <div className="text-sm text-red-600">{err}</div> : null}
        <div className="rounded-lg border p-3">
          <div className="font-medium">MFA</div>
          <div className="text-sm text-neutral-600">Status: {user.mfaEnabled ? 'enabled' : 'disabled'}</div>
        </div>

        {!user.mfaEnabled ? (
          <div className="space-y-3">
            <button
              className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
              onClick={() => {
                setErr(null);
                void api
                  .mfaSetup()
                  .then((r) => setSetup(r))
                  .catch((e2: any) => setErr(String(e2?.message ?? e2)));
              }}
            >
              Generate MFA secret
            </button>

            {setup ? (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="text-sm">
                  Add this secret to Google Authenticator/Authy, then enter a code to enable:
                </div>
                <div className="rounded-md bg-neutral-50 p-2 font-mono text-xs break-all">{setup.secret}</div>
                <div className="text-xs text-neutral-600 break-all">otpauth: {setup.otpauth}</div>
                <div className="flex flex-wrap gap-2">
                  <input className="rounded-md border px-3 py-2 text-sm" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
                  <button
                    className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
                    onClick={() => {
                      setErr(null);
                      void api
                        .mfaEnable(code)
                        .then((r) => setRecoveryCodes(r.recoveryCodes))
                        .then(() => refresh())
                        .catch((e2: any) => setErr(String(e2?.message ?? e2)));
                    }}
                  >
                    Enable MFA
                  </button>
                </div>
              </div>
            ) : null}

            {recoveryCodes ? (
              <div className="rounded-lg border p-3">
                <div className="font-medium">Recovery codes (save now)</div>
                <ul className="mt-2 grid gap-1 font-mono text-sm">
                  {recoveryCodes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input className="rounded-md border px-3 py-2 text-sm" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
              <button
                className="rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
                onClick={() => {
                  setErr(null);
                  void api
                    .mfaDisable(code)
                    .then(() => refresh())
                    .catch((e2: any) => setErr(String(e2?.message ?? e2)));
                }}
              >
                Disable MFA
              </button>
            </div>
            <div className="text-xs text-neutral-600">
              For sign-in, send the current code via the <span className="font-mono">x-mfa-code</span> header (web UI does this automatically).
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

