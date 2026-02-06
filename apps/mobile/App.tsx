import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Button, FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

const accessKey = 'accessToken';

async function apiRequest<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as any) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message ?? res.statusText);
  return data as T;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState('');

  const chartUrl = useMemo(() => {
    if (!selectedInstrumentId) return '';
    const id = encodeURIComponent(selectedInstrumentId);
    const token = encodeURIComponent(accessToken);
    return `${WEB_BASE_URL}/instruments/${id}?token=${token}`;
  }, [selectedInstrumentId, accessToken]);

  useEffect(() => {
    (async () => {
      const token = (await AsyncStorage.getItem(accessKey)) ?? '';
      setAccessToken(token);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    setErr(null);
    apiRequest<{ watchlists: any[] }>(`/watchlists`, accessToken)
      .then((r) => setWatchlists(r.watchlists ?? []))
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [accessToken]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (selectedInstrumentId && chartUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Button title="Back" onPress={() => setSelectedInstrumentId(null)} />
          <Text style={styles.headerTitle}>{selectedInstrumentId}</Text>
          <View style={{ width: 60 }} />
        </View>
        <WebView source={{ uri: chartUrl }} />
      </SafeAreaView>
    );
  }

  if (!accessToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Stock Market Suite</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
          {err ? <Text style={styles.error}>{err}</Text> : null}
          <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <TextInput style={styles.input} placeholder="MFA code (optional)" value={mfaCode} onChangeText={setMfaCode} />
          <Button
            title="Sign in"
            onPress={() => {
              setErr(null);
              fetch(`${API_BASE_URL}/auth/signin`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(mfaCode ? { 'x-mfa-code': mfaCode } : {}),
                },
                body: JSON.stringify({ email, password }),
              })
                .then(async (r) => {
                  const text = await r.text();
                  const data = text ? JSON.parse(text) : null;
                  if (!r.ok) throw new Error(data?.message ?? r.statusText);
                  const token = String(data?.accessToken ?? '');
                  if (!token) throw new Error('Missing accessToken');
                  await AsyncStorage.setItem(accessKey, token);
                  setAccessToken(token);
                })
                .catch((e) => setErr(String(e?.message ?? e)));
            }}
          />
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title="Sign out"
          onPress={() => {
            void AsyncStorage.removeItem(accessKey).then(() => {
              setAccessToken('');
              setWatchlists([]);
            });
          }}
        />
        <Text style={styles.headerTitle}>Watchlists</Text>
        <Button
          title="Refresh"
          onPress={() => {
            setErr(null);
            apiRequest<{ watchlists: any[] }>(`/watchlists`, accessToken)
              .then((r) => setWatchlists(r.watchlists ?? []))
              .catch((e) => setErr(String(e?.message ?? e)));
          }}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Register push token (Expo)</Text>
        <TextInput
          style={styles.input}
          placeholder="ExponentPushToken[...]"
          value={pushToken}
          onChangeText={setPushToken}
        />
        <Button
          title="Register token"
          onPress={() => {
            setErr(null);
            apiRequest(`/notifications/device/register`, accessToken, {
              method: 'POST',
              body: JSON.stringify({ token: pushToken, platform: 'ios' }),
            }).catch((e) => setErr(String(e?.message ?? e)));
          }}
        />
      </View>
      {err ? <Text style={styles.error}>{err}</Text> : null}
      <FlatList
        data={watchlists}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {item.name} {item.pinned ? '(pinned)' : ''}
            </Text>
            {(item.items ?? []).slice(0, 20).map((it: any) => (
              <View key={it.instrument.id} style={styles.row}>
                <Text>{it.instrument.symbol}</Text>
                <Button title="Chart" onPress={() => setSelectedInstrumentId(it.instrument.id)} />
              </View>
            ))}
          </View>
        )}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    margin: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#52525b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 10,
    padding: 10,
  },
  error: {
    color: '#dc2626',
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
