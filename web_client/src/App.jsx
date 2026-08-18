import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { memberCount } from "./domain/members.js";
import { startSync } from "./sync/sync.js";
import TopBar from "./components/TopBar.jsx";
import TabBar from "./components/TabBar.jsx";
import CheckInScreen from "./components/checkin/CheckInScreen.jsx";
import FollowUpScreen from "./components/followup/FollowUpScreen.jsx";
import MembersScreen from "./components/members/MembersScreen.jsx";
import MemberProfileScreen from "./components/members/MemberProfileScreen.jsx";
import NewMemberFlow from "./components/members/NewMemberFlow.jsx";

// Navigation is local state, not a router: this is a static offline build on
// a kiosk-posture tablet, where history management buys nothing
// (frontend-spec.md §3.4, §5.1).
//
//   tab tap          → set tab, clear the detail view
//   row tap          → open the profile over the originating tab
//   back on profile  → return to that tab, still scrolled where it was
function App() {
  const [tab, setTab] = useState("checkin");
  const [detailMemberId, setDetailMemberId] = useState(null);

  // Drives the first-run empty states. undefined until the first read lands,
  // so nothing flashes "no members" before the data arrives.
  const totalMembers = useLiveQuery(() => memberCount());

  // Push queued writes whenever the tablet has a network (TRD 7). Deliberately
  // renders nothing: sync is additive, never blocks a local flow, and its
  // failures are silent to staff (PRD 4.10) — a banner here would report a
  // problem the front desk cannot act on and did not cause.
  useEffect(() => startSync(), []);

  function selectTab(nextTab) {
    setDetailMemberId(null);
    setTab(nextTab);
  }

  function goToNewMember() {
    setDetailMemberId(null);
    setTab("new");
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
          {tab === "followup" && (
            <FollowUpScreen
              hasMembers={totalMembers === undefined || totalMembers > 0}
              onSelectMember={setDetailMemberId}
              onRegisterFirst={goToNewMember}
            />
          )}
          {tab === "members" && (
            <MembersScreen
              onSelectMember={setDetailMemberId}
              onRegisterFirst={goToNewMember}
            />
          )}
          {tab === "new" && <NewMemberFlow onDone={() => setTab("checkin")} />}
        </>
      )}

      {/* The tab bar stays live on the profile — the One-Tap-Away Rule has
          no exception (DESIGN.md). */}
      <TabBar active={tab} onChange={selectTab} />
    </>
  );
}

export default App;
