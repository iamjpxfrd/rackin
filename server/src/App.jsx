import { useState } from "react";
import TopBar from "./components/TopBar.jsx";
import TabBar from "./components/TabBar.jsx";
import CheckInScreen from "./components/checkin/CheckInScreen.jsx";
import FollowUpScreen from "./components/followup/FollowUpScreen.jsx";
import MembersScreen from "./components/members/MembersScreen.jsx";
import MemberProfileScreen from "./components/members/MemberProfileScreen.jsx";

// Navigation is local state, not a router: this is a read-only dashboard on
// a small number of screens, where history management buys nothing.
//
//   tab tap          → set tab, clear the detail view
//   row tap          → open the profile over the originating tab
//   back on profile  → return to that tab, still scrolled where it was
//
// Registration, payment recording, and check-in creation used to live here
// too (New Member, Record Payment, the numpad/search/QR check-in flow, local
// sync). All of that is gone: android/ is the only client that creates or
// edits data now, and this app reads whatever has synced to the backend
// ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22).
function App() {
  const [tab, setTab] = useState("checkin");
  const [detailMemberId, setDetailMemberId] = useState(null);

  function selectTab(nextTab) {
    setDetailMemberId(null);
    setTab(nextTab);
  }

  return (
    <>
      <TopBar />

      {detailMemberId ? (
        <MemberProfileScreen
          memberId={detailMemberId}
          onBack={() => setDetailMemberId(null)}
        />
      ) : (
        <>
          {tab === "checkin" && <CheckInScreen />}
          {tab === "followup" && <FollowUpScreen onSelectMember={setDetailMemberId} />}
          {tab === "members" && <MembersScreen onSelectMember={setDetailMemberId} />}
        </>
      )}

      {/* The tab bar stays live on the profile — the One-Tap-Away Rule has
          no exception (DESIGN.md). */}
      <TabBar active={tab} onChange={selectTab} />
    </>
  );
}

export default App;
