import { useState } from "react";
import TopBar from "./components/TopBar.jsx";
import TabBar from "./components/TabBar.jsx";
import CheckInScreen from "./components/checkin/CheckInScreen.jsx";
import PlaceholderScreen from "./components/PlaceholderScreen.jsx";

const SCREEN_TITLE = { lapsed: "Lapsed", members: "Members", new: "New Member" };

function App() {
  const [activeTab, setActiveTab] = useState("checkin");

  return (
    <>
      <TopBar />
      {activeTab === "checkin" ? (
        <CheckInScreen />
      ) : (
        <PlaceholderScreen title={SCREEN_TITLE[activeTab]} />
      )}
      <TabBar active={activeTab} onChange={setActiveTab} />
    </>
  );
}

export default App;
