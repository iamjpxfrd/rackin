import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import TopBar from './src/components/TopBar.jsx';
import TabBar from './src/components/TabBar.jsx';
import CheckInScreen from './src/components/checkin/CheckInScreen.jsx';
import FollowUpScreen from './src/components/followup/FollowUpScreen.jsx';
import MembersScreen from './src/components/members/MembersScreen.jsx';
import { ToastHost } from './src/components/ui/Toast.jsx';
import { startSync } from './src/sync/sync.js';

// Kinetic Court's three type roles (see tailwind.config.js's fontFamily):
// Zen Dots for the wordmark + numpad digits only, Fjalla One for shouty
// ALL-CAPS labels/buttons, Inter for everything read as prose. Registered
// under names that match the fontFamily values used across the app —
// custom fonts on Android ignore the `fontWeight` style entirely, so each
// Inter weight needed anywhere (font-body/-medium/-semibold/-bold) has to
// be its own registered family, not one file switched by weight.
const FONTS = {
  ZenDots_400Regular: require('./assets/fonts/ZenDots-Regular.ttf'),
  FjallaOne_400Regular: require('./assets/fonts/FjallaOne-Regular.ttf'),
  Inter_400Regular: require('./assets/fonts/Inter-Regular.ttf'),
  Inter_500Medium: require('./assets/fonts/Inter-Medium.ttf'),
  Inter_600SemiBold: require('./assets/fonts/Inter-SemiBold.ttf'),
  Inter_700Bold: require('./assets/fonts/Inter-Bold.ttf'),
};

// Navigation is local state, not a router — ported from server/src/App.jsx,
// same reasoning (frontend-spec.md §3.4, §5.1): this is a kiosk-posture
// tablet where history management buys nothing.
//
// "checkin", "followup", and "members" have real screens now — + New and
// Store are still on server/ only (Task 4's UI-port checklist). Tapping
// those tabs shows an honest "not yet ported" placeholder rather than a
// router dead-end or a silently missing tab.
function App() {
  const [tab, setTab] = useState('checkin');
  const [fontsLoaded] = useFonts(FONTS);

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

  // Blank rather than a flash of system-font text — the three custom
  // families load in well under a frame on-device, but Text still renders
  // with whatever's ready at mount if nothing gates it.
  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-page" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-page">
        <StatusBar barStyle="light-content" />
        <TopBar />

        {tab === 'checkin' && <CheckInScreen />}
        {tab === 'followup' && <FollowUpScreen />}
        {tab === 'members' && <MembersScreen />}
        {tab !== 'checkin' && tab !== 'followup' && tab !== 'members' && (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-center font-body text-base text-muted">
              This tab isn't ported to the mobile app yet (Task 4).
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
