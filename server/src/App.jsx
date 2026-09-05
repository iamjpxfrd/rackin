import { useState } from "react";
import TopBar from "./components/TopBar.jsx";
import StaggeredMenu from "./components/nav/StaggeredMenu.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import AnalyticsScreen from "./components/analytics/AnalyticsScreen.jsx";
import CheckInScreen from "./components/checkin/CheckInScreen.jsx";
import FollowUpScreen from "./components/followup/FollowUpScreen.jsx";
import MembersScreen from "./components/members/MembersScreen.jsx";
import StoreScreen from "./components/store/StoreScreen.jsx";

// Desktop dashboard shell, ported from the design canvas's Web* artboards
// (WebLogin/WebCheckIn/WebFollowUp/WebMembers/WebAnalytics/WebStore): a top
// bar + a staggered slide-in nav overlay in place of the tablet's bottom tab
// bar, five screens (Analytics, Check-In, Follow Up, Members, Store — no
// Home; Analytics stands in as the landing overview) instead of three, and
// a login screen ahead of all of it.
//
// `loggedIn` is NOT real authentication — there is no session, no backend
// call, no validation; submitting the login form just flips this flag. Real
// per-person auth (Task 6, ADR-002 Action Item 6a) replaces this gate
// entirely once it exists; until then this only demonstrates the intended
// flow, it does not guard anything.
//
// Registration, payment recording, and check-in creation used to live here
// too (New Member, Record Payment, the numpad/search/QR check-in flow, local
// sync), along with a member-profile detail overlay. All of that is gone:
// android/ is the only client that creates or edits data now, and this app
// reads whatever has synced to the backend
// ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22).
// The profile overlay specifically is dropped rather than ported to the new
// shell: getMemberProfile() is still a TODO stub (domain/members.js) that
// always returns null, so it only ever led to a "Member not found" screen —
// the canonical design's Members screen has no detail panel at all, a row
// here is just a row.
function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState("analytics");
  const [menuOpen, setMenuOpen] = useState(false);

  if (!loggedIn) {
    return <LoginScreen onLogIn={() => setLoggedIn(true)} />;
  }

  function selectScreen(next) {
    setScreen(next);
    setMenuOpen(false);
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-page">
      <TopBar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} />

      <main className="min-h-0 flex-1 overflow-auto px-10 py-8">
        {screen === "analytics" && <AnalyticsScreen />}
        {screen === "checkin" && <CheckInScreen />}
        {screen === "followup" && <FollowUpScreen />}
        {screen === "members" && <MembersScreen />}
        {screen === "store" && <StoreScreen />}
      </main>

      <StaggeredMenu open={menuOpen} onSelect={selectScreen} />
    </div>
  );
}

export default App;
