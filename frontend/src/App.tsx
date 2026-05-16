import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./shared/api";
import { useGameStore } from "./store/gameStore";
import MainMenu from "./features/menu/MainMenu";
import MissionSelect from "./features/mission-select/MissionSelect";
import Briefing from "./features/briefing/Briefing";
import Hangar from "./features/hangar/Hangar";
import FlightView from "./features/flight/FlightView";
import Debrief from "./features/debrief/Debrief";
import Settings from "./features/settings/Settings";
import Crafting from "./features/crafting/Crafting";

export default function App() {
  const setMissions = useGameStore((s) => s.setMissions);
  const setPlayer = useGameStore((s) => s.setPlayer);

  useEffect(() => {
    api
      .ensureGuest()
      .then(() => Promise.all([api.listMissions(), api.me()]))
      .then(([m, p]) => {
        setMissions(m.missions);
        setPlayer(p);
      });
  }, [setMissions, setPlayer]);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/missions" element={<MissionSelect />} />
        <Route path="/missions/:slug/briefing" element={<Briefing />} />
        <Route path="/missions/:slug/hangar" element={<Hangar />} />
        <Route path="/missions/:slug/flight" element={<FlightView />} />
        <Route path="/missions/:slug/debrief" element={<Debrief />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/crafting" element={<Crafting />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
