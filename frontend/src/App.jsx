import { useState } from "react";
import TopBar from "./components/TopBar.jsx";
import TabBar from "./components/TabBar.jsx";
import CheckInScreen from "./components/checkin/CheckInScreen.jsx";
import NewMemberFlow from "./components/members/NewMemberFlow.jsx";
import PlaceholderScreen from "./components/PlaceholderScreen.jsx";

const SCREEN_TITLE = { followup: "Follow Up", members: "Members" };

// Navigation is local state, not a router: this is a static offline build on
// a kiosk-posture tablet, where history management buys nothing
// (frontend-spec.md §3.4). detailMemberId opens the Member Profile over
// whichever tab the row was tapped from.
function App() {
  const [activeTab, setActiveTab] = useState("checkin");

  function selectTab(tab) {
    setActiveTab(tab);
  }

  return (
    <>
      <TopBar />
      {activeTab === "checkin" && <CheckInScreen />}
      {activeTab === "new" && <NewMemberFlow onDone={() => setActiveTab("checkin")} />}
      {(activeTab === "followup" || activeTab === "members") && (
        <PlaceholderScreen title={SCREEN_TITLE[activeTab]} />
      )}
      <TabBar active={activeTab} onChange={selectTab} />
    </>
  );
}

export default App;
