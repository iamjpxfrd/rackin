import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TopBar from './src/components/TopBar.jsx';
import TabBar from './src/components/TabBar.jsx';
import CheckInScreen from './src/components/checkin/CheckInScreen.jsx';
import { ToastHost } from './src/components/ui/Toast.jsx';
import { startSync } from './src/sync/sync.js';

// Navigation is local state, not a router — ported from server/src/App.jsx,
// same reasoning (frontend-spec.md §3.4, §5.1): this is a kiosk-posture
// tablet where history management buys nothing.
//
// Only "checkin" has a real screen so far — Follow Up, Members, and + New
// are still on server/ only (Task 3's UI-port checklist). Tapping those
// tabs shows an honest "not yet ported" placeholder rather than a router
// dead-end or a silently missing tab.
function App() {
  const [tab, setTab] = useState('checkin');

  // Push queued writes whenever the tablet has a network (TRD 7). startSync
  // is async here (opening expo-sqlite is), unlike the web version's
  // synchronous Dexie-backed one — see src/sync/sync.js's header.
  useEffect(() => {
    let cancelled = false;
    let stop = () => {};
    startSync().then((stopFn) => {
      if (cancelled) {
        stopFn();
        return;
      }
      stop = stopFn;
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-page">
        <StatusBar barStyle="light-content" />
        <TopBar />

        {tab === 'checkin' && <CheckInScreen />}
        {tab !== 'checkin' && (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-center font-body text-base text-muted">
              This tab isn't ported to the mobile app yet (Task 3).
            </Text>
          </View>
        )}

        {/* The tab bar stays live everywhere — the One-Tap-Away Rule has no
            exception (DESIGN.md). */}
        <TabBar active={tab} onChange={setTab} />

        {/* App-root so a toast fired from a sheet (e.g. OnDeskSheet) still
            shows after the sheet that triggered it closes. */}
        <ToastHost />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
