import { lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useGameStore } from "./store/gameStore";
import AppLayout from "./components/AppLayout";
import MainMenu from "./features/menu/MainMenu";
import MissionSelect from "./features/mission-select/MissionSelect";
import Briefing from "./features/briefing/Briefing";
import Hangar from "./features/hangar/Hangar";
import Debrief from "./features/debrief/Debrief";
import Settings from "./features/settings/Settings";
import Crafting from "./features/crafting/Crafting";
import FlightGuide from "./features/guide/FlightGuide";
import { loadFlightView } from "./features/flight/loadFlightView";

const FlightView = lazy(loadFlightView);

function FlightRoute({ onContentReady }: { onContentReady: (element: HTMLElement | null) => void }) {
  const runId = useGameStore((s) => s.runId);
  const { slug } = useParams<{ slug: string }>();
  return runId
    ? <FlightView onContentReady={onContentReady} />
    : <Navigate to={`/missions/${slug}/hangar`} replace />;
}

export default function App() {
  const initialize = useGameStore((s) => s.initialize);
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const hasNavigated = useRef(false);

  const focusContent = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    if (previousPath.current !== pathname) hasNavigated.current = true;
    if (!hasNavigated.current) return;
    previousPath.current = pathname;
    window.scrollTo({ top: 0, behavior: "instant" });
    element.focus({ preventScroll: true });
  }, [pathname]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const routes = (
    <Suspense fallback={<div className="empty-state" role="status"><span className="loading-orbit" />Preparing your flight deck...</div>}>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/missions" element={<MissionSelect />} />
        <Route path="/missions/:slug/briefing" element={<Briefing />} />
        <Route path="/missions/:slug/hangar" element={<Hangar />} />
        <Route path="/missions/:slug/flight" element={<FlightRoute onContentReady={focusContent} />} />
        <Route path="/missions/:slug/debrief" element={<Debrief />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/crafting" element={<Crafting />} />
        <Route path="/guide" element={<FlightGuide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );

  return (
    <div className="app-shell">
      {pathname.endsWith("/flight") ? routes : <AppLayout onContentReady={focusContent}>{routes}</AppLayout>}
    </div>
  );
}
