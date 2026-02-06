'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

type AuthState = {
  ready: boolean;
  user: { id: string; email: string; mfaEnabled: boolean } | null;
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string, mfaCode?: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthState['user']>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      api.setAccessToken(token);
      params.delete('token');
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, []);

  const loadMe = useCallback(async () => {
    const token = api.getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.me();
      setUser(me.user);
    } catch {
      try {
        await api.refresh();
        const me = await api.me();
        setUser(me.user);
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    void loadMe().finally(() => setReady(true));
  }, [loadMe]);

  const signUp = useCallback(async (email: string, password: string) => {
    await api.signUp(email, password);
    await loadMe();
  }, [loadMe]);

  const signIn = useCallback(async (email: string, password: string, mfaCode?: string) => {
    await api.signIn(email, password, mfaCode);
    await loadMe();
  }, [loadMe]);

  const signOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    await api.refresh();
    await loadMe();
  }, [loadMe]);

  const value = useMemo<AuthState>(
    () => ({ ready, user, signUp, signIn, signOut, refresh }),
    [ready, user, signUp, signIn, signOut, refresh],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
};
