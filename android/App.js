import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStore } from './src/storage/store';
import { isSyncConfigured } from './src/sync/api';
import { pendingCount } from './src/sync/outbox';
import { startSync } from './src/sync/sync';

// Temporary on-device smoke check for the Task 3 storage/sync adapters —
// opens the SQLite db, round-trips one row through it, then starts the sync
// loop against whatever EXPO_PUBLIC_RACKIN_API_URL/KEY this build has (none,
// by default, which is a supported "offline-only" configuration — see
// src/sync/api.js). Not the real app UI; swap for the real check-in screen
// once the UI port starts.
export default function App() {
  const [storageStatus, setStorageStatus] = useState('opening database…');
  const [syncStatus, setSyncStatus] = useState('starting sync…');

  useEffect(() => {
    let cancelled = false;
    let stopSync = () => {};

    (async () => {
      try {
        const store = await getStore();
        await store.members.put({ id: 'smoke-test', name: 'Storage Check', createdAt: new Date().toISOString() });
        const row = await store.members.get('smoke-test');
        const count = await store.members.count();
        if (!cancelled) {
          setStorageStatus(row ? `storage OK — ${count} member row(s), read back: ${row.name}` : 'storage FAILED — round-trip read returned nothing');
        }
      } catch (error) {
        if (!cancelled) setStorageStatus(`storage FAILED — ${error.message}`);
        return;
      }

      try {
        const stop = await startSync();
        if (cancelled) {
          stop();
          return;
        }
        stopSync = stop;
        const pending = await pendingCount();
        setSyncStatus(
          isSyncConfigured()
            ? `sync started — ${pending} operation(s) queued`
            : `sync started — offline-only build (no EXPO_PUBLIC_RACKIN_API_URL/KEY), ${pending} queued`,
        );
      } catch (error) {
        if (!cancelled) setSyncStatus(`sync FAILED — ${error.message}`);
      }
    })();

    return () => {
      cancelled = true;
      stopSync();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text>{storageStatus}</Text>
      <Text>{syncStatus}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
