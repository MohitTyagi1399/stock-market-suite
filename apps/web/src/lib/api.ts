import { API_BASE_URL } from './env';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const getAccessToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('accessToken') ?? '';
};

const setAccessToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', token);
};

export const api = {
  getAccessToken,
  setAccessToken,
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new ApiError(res.status, data?.message ?? res.statusText);
    return data as T;
  },
  async signUp(email: string, password: string) {
    const data = await api.request<{ accessToken: string }>(`/auth/signup`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.accessToken);
    return data;
  },
  async signIn(email: string, password: string, mfaCode?: string) {
    const headers: Record<string, string> = {};
    if (mfaCode) headers['x-mfa-code'] = mfaCode;
    const data = await api.request<{ accessToken: string }>(`/auth/signin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.accessToken);
    return data;
  },
  async refresh() {
    const data = await api.request<{ accessToken: string }>(`/auth/refresh`, { method: 'POST' });
    setAccessToken(data.accessToken);
    return data;
  },
  async signOut() {
    await api.request(`/auth/signout`, { method: 'POST' });
    setAccessToken('');
    localStorage.removeItem('accessToken');
  },
  async me() {
    return await api.request<{ user: { id: string; email: string; mfaEnabled: boolean } }>(`/auth/me`);
  },

  async listBrokers() {
    return await api.request<{ connections: Array<{ broker: string; status: string; updatedAt: string }> }>(`/brokers`);
  },
  async connectAlpaca(input: { keyId: string; secretKey: string; env: 'paper' | 'live' }) {
    return await api.request(`/brokers/alpaca/connect`, { method: 'POST', body: JSON.stringify(input) });
  },
  async connectZerodha(input: { apiKey: string; accessToken: string }) {
    return await api.request(`/brokers/zerodha/connect`, { method: 'POST', body: JSON.stringify(input) });
  },

  async searchInstruments(q: string, market?: 'US' | 'IN') {
    const url = new URL(`${API_BASE_URL}/instruments/search`);
    url.searchParams.set('q', q);
    if (market) url.searchParams.set('market', market);
    return await api.request<{ instruments: any[] }>(url.pathname + url.search);
  },
  async upsertInstrument(input: any) {
    return await api.request(`/instruments/upsert`, { method: 'POST', body: JSON.stringify(input) });
  },
  async getInstrument(id: string) {
    return await api.request<{ instrument: any }>(`/instruments/${encodeURIComponent(id)}`);
  },

  async listWatchlists() {
    return await api.request<{ watchlists: any[] }>(`/watchlists`);
  },
  async createWatchlist(name: string) {
    return await api.request(`/watchlists`, { method: 'POST', body: JSON.stringify({ name }) });
  },
  async addWatchlistItem(watchlistId: string, instrumentId: string) {
    return await api.request(`/watchlists/${encodeURIComponent(watchlistId)}/items`, {
      method: 'POST',
      body: JSON.stringify({ instrumentId }),
    });
  },
  async removeWatchlistItem(watchlistId: string, instrumentId: string) {
    return await api.request(`/watchlists/${encodeURIComponent(watchlistId)}/items/${encodeURIComponent(instrumentId)}`, {
      method: 'DELETE',
    });
  },

  async getQuote(instrumentId: string) {
    return await api.request<{ quote: any }>(`/market/${encodeURIComponent(instrumentId)}/quote`);
  },
  async getCandles(instrumentId: string, args: { timeframe: string; from: string; to: string }) {
    const url = new URL(`${API_BASE_URL}/market/${encodeURIComponent(instrumentId)}/candles`);
    url.searchParams.set('timeframe', args.timeframe);
    url.searchParams.set('from', args.from);
    url.searchParams.set('to', args.to);
    return await api.request<{ candles: any[] }>(url.pathname + url.search);
  },

  async placeOrder(input: any) {
    return await api.request(`/orders`, { method: 'POST', body: JSON.stringify(input) });
  },
  async listOrders() {
    return await api.request<{ orders: any[] }>(`/orders`);
  },
  async cancelOrder(id: string) {
    return await api.request(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  },
  async syncOrders() {
    return await api.request(`/orders/sync`, { method: 'POST' });
  },

  async portfolioSummary() {
    return await api.request(`/portfolio/summary`);
  },
  async portfolioPositions() {
    return await api.request(`/portfolio/positions`);
  },

  async mfaSetup() {
    return await api.request<{ secret: string; otpauth: string }>(`/auth/mfa/setup`, { method: 'POST' });
  },
  async mfaEnable(code: string) {
    return await api.request<{ ok: true; recoveryCodes: string[] }>(`/auth/mfa/enable`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  async mfaDisable(code: string) {
    return await api.request(`/auth/mfa/disable`, { method: 'POST', body: JSON.stringify({ code }) });
  },
};
