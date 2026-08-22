import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import TopBar from './src/components/TopBar.jsx';
import TabBar from './src/components/TabBar.jsx';
import CheckInScreen from './src/components/checkin/CheckInScreen.jsx';
import FollowUpScreen from './src/components/followup/FollowUpScreen.jsx';
import MembersScreen from './src/components/members/MembersScreen.jsx';
import MemberProfileScreen from './src/components/members/MemberProfileScreen.jsx';
import NewMemberFlow from './src/components/members/NewMemberFlow.jsx';
import StoreScreen from './src/components/store/StoreScreen.jsx';
import { ToastHost } from './src/components/ui/Toast.jsx';
import { startSync } from './src/sync/sync.js';
import { forceLogoutOverdue } from './src/domain/checkIn.js';

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
//   tab tap          -> set tab, clear the detail view
//   row tap          -> open the profile over the originating tab
//   back on profile  -> return to that tab, tab bar stays live throughout
//
// Every tab now has a real screen — Store (Task 4) was the last one built.
function App() {
  const [tab, setTab] = useState('checkin');
  const [detailMemberId, setDetailMemberId] = useState(null);
  const [fontsLoaded] = useFonts(FONTS);

  function selectTab(nextTab) {
    setDetailMemberId(null);
    setTab(nextTab);
  }

  function goToNewMember() {
    setDetailMemberId(null);
    setTab('new');
  }

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

  // Force-logout sweep for anyone still checked in past closing (2026-08-23,
  // explicit gym hours). A plain 60s interval, not a per-second useClock
  // subscription here — App is the whole tree's root, and re-rendering
  // everything every second just for a check that's a no-op 23.5 hours a day
  // would be real, needless churn. forceLogoutOverdue() itself is a cheap
  // no-op outside the window (two Date comparisons, no query) — see its own
  // header comment. Runs regardless of which tab is active, since a member
  // left checked in shouldn't depend on staff happening to be on Check-In.
  useEffect(() => {
    forceLogoutOverdue();
    const timer = setInterval(forceLogoutOverdue, 60_000);
    return () => clearInterval(timer);
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
        <TopBar showClock={tab === 'checkin' && !detailMemberId} />

        {detailMemberId ? (
          <MemberProfileScreen memberId={detailMemberId} onBack={() => setDetailMemberId(null)} />
        ) : (
          <>
            {tab === 'checkin' && <CheckInScreen />}
            {tab === 'followup' && <FollowUpScreen onSelectMember={setDetailMemberId} />}
            {tab === 'members' && (
              <MembersScreen onSelectMember={setDetailMemberId} onRegisterFirst={goToNewMember} />
            )}
            {tab === 'new' && <NewMemberFlow onDone={() => setTab('checkin')} />}
            {tab === 'store' && <StoreScreen />}
          </>
        )}

        {/* The tab bar stays live everywhere, including over the profile —
            the One-Tap-Away Rule has no exception (DESIGN.md). */}
        <TabBar active={tab} onChange={selectTab} />

        {/* App-root so a toast fired from a sheet (e.g. OnDeskSheet) still
            shows after the sheet that triggered it closes. */}
        <ToastHost />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
