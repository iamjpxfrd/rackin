import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStore } from './src/storage/store';

// Temporary on-device smoke check for the Task 3 storage adapter — opens the
// SQLite db, applies the schema, and round-trips one row through it. Not the
// real app UI; swap for the real check-in screen once the UI port starts.
export default function App() {
  const [status, setStatus] = useState('opening database…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = await getStore();
        await store.members.put({ id: 'smoke-test', name: 'Storage Check', createdAt: new Date().toISOString() });
        const row = await store.members.get('smoke-test');
        const count = await store.members.count();
        if (!cancelled) {
          setStatus(row ? `storage OK — ${count} member row(s), read back: ${row.name}` : 'storage FAILED — round-trip read returned nothing');
        }
      } catch (error) {
        if (!cancelled) setStatus(`storage FAILED — ${error.message}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text>{status}</Text>
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
