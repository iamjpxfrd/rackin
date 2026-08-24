import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
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
import PinEntrySheet from './src/components/security/PinEntrySheet.jsx';
import { useLiveQuery } from './src/hooks/useLiveQuery.js';
import { useBackHandler } from './src/hooks/useBackHandler.js';
import { getMembersPin } from './src/domain/security.js';
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

  // Members tab gate (Task 5's Security Measures item). No PIN set is the
  // default and leaves Members open, same as today. Once set, every tap on
  // the Members tab re-prompts — nothing here is remembered between visits,
  // so stepping away to another tab and back re-locks it.
  const membersPin = useLiveQuery(() => getMembersPin());
  const [pinPromptOpen, setPinPromptOpen] = useState(false);

  function selectTab(nextTab) {
    if (nextTab === 'members' && membersPin) {
      setPinPromptOpen(true);
      return;
    }
    setDetailMemberId(null);
    setTab(nextTab);
  }

  function unlockMembers() {
    setPinPromptOpen(false);
    setDetailMemberId(null);
    setTab('members');
  }

  function goToNewMember() {
    setDetailMemberId(null);
    setTab('new');
  }

  // Hardware/gesture back button (2026-08-25 follow-up): Member Profile and
  // the New Member form are both reached without leaving the tab bar (see
  // the header comment above), so a back press here should step back
  // through that same local navigation instead of falling through to
  // Android's default "exit the app" — New Member returns to Check-In,
  // matching where a completed registration's own onDone already sends it
  // (see NewMemberFlow below). Each open sheet/dialog/confirmation handles
  // its own back press (useBackHandler.js's header comment) and consumes it
  // before this one ever sees it, so this only fires once nothing else is
  // open over the current tab.
  useBackHandler(
    () => {
      if (detailMemberId) {
        setDetailMemberId(null);
      } else {
        setTab('checkin');
      }
    },
    Boolean(detailMemberId) || tab === 'new',
  );

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

        {/* All five tabs stay mounted underneath detailMemberId's overlay
            (Task 6) instead of the previous {tab === 'x' && <Screen/>}
            conditional rendering. That pattern unmounted and remounted a
            screen on every switch, resetting every useLiveQuery back to its
            undefined "not loaded" state — staff would see the empty state
            flash before the query re-ran, even for data that was already
            loaded seconds earlier. display: 'none' on the inactive tabs'
            wrapper hides them the same way conditional rendering did
            visually, but keeps each screen's state (and its live query
            results) alive across switches. */}
        <View style={{ flex: 1, display: detailMemberId ? 'none' : 'flex' }}>
          <View style={{ flex: 1, display: tab === 'checkin' ? 'flex' : 'none' }}>
            <CheckInScreen active={tab === 'checkin'} />
          </View>
          <View style={{ flex: 1, display: tab === 'followup' ? 'flex' : 'none' }}>
            <FollowUpScreen onSelectMember={setDetailMemberId} />
          </View>
          <View style={{ flex: 1, display: tab === 'members' ? 'flex' : 'none' }}>
            <MembersScreen onSelectMember={setDetailMemberId} onRegisterFirst={goToNewMember} />
          </View>
          <View style={{ flex: 1, display: tab === 'new' ? 'flex' : 'none' }}>
            <NewMemberFlow onDone={() => setTab('checkin')} />
          </View>
          <View style={{ flex: 1, display: tab === 'store' ? 'flex' : 'none' }}>
            <StoreScreen />
          </View>
        </View>

        {detailMemberId && (
          <MemberProfileScreen memberId={detailMemberId} onBack={() => setDetailMemberId(null)} />
        )}

        {/* The tab bar stays live everywhere, including over the profile —
            the One-Tap-Away Rule has no exception (DESIGN.md). */}
        <TabBar active={tab} onChange={selectTab} />

        {pinPromptOpen && (
          <PinEntrySheet
            mode="unlock"
            expectedPin={membersPin}
            onUnlock={unlockMembers}
            onClose={() => setPinPromptOpen(false)}
          />
        )}

        {/* App-root so a toast fired from a sheet (e.g. OnDeskSheet) still
            shows after the sheet that triggered it closes. */}
        <ToastHost />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
