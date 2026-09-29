import { create } from "zustand";
import { api, type AuthProfile, type DailyChallenge, type MissionDetail, type MissionSummary, type RunResult } from "../shared/api";

type GameStore = {
  sessionStatus: "idle" | "connecting" | "ready" | "error";
  initialize: () => Promise<boolean>;
  missionRefreshError: string | null;
  refreshMissions: () => Promise<void>;
  missions: MissionSummary[];
  currentMission: MissionDetail | null;
  runId: string | null;
  lastResult: RunResult | null;
  player: AuthProfile | null;
  daily: DailyChallenge | null;
  hud: { fuel: number; hull: number; altitude: number; objective: string; progress: number };
  setMissions: (m: MissionSummary[]) => void;
  setCurrentMission: (m: MissionDetail | null) => void;
  setRunId: (id: string | null) => void;
  setLastResult: (r: RunResult | null) => void;
  setPlayer: (p: AuthProfile | null) => void;
  setDaily: (d: DailyChallenge | null) => void;
  setHud: (h: Partial<GameStore["hud"]>) => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  sessionStatus: "idle",
  initialize: async () => {
    // StrictMode and simultaneous screens must share one guest-session bootstrap.
    if (get().sessionStatus === "connecting") return false;
    set({ sessionStatus: "connecting", player: null, missions: [], daily: null, currentMission: null, runId: null, lastResult: null, missionRefreshError: null });
    try {
      await api.ensureGuest();
      const [missions, player] = await Promise.all([api.listMissions(), api.me()]);
      set({ missions: missions.missions, player, sessionStatus: "ready" });
      return true;
    } catch {
      set({ sessionStatus: "error" });
      return false;
    }
  },
  missionRefreshError: null,
  refreshMissions: async () => {
    const { runId, player } = get();
    const ownsRefresh = () => get().runId === runId && get().player?.player_id === player?.player_id;
    try {
      const result = await api.listMissions();
      if (ownsRefresh()) set({ missions: result.missions, missionRefreshError: null });
    } catch (reason) {
      if (ownsRefresh()) set({ missionRefreshError: reason instanceof Error ? reason.message : "Please try again." });
    }
  },
  missions: [],
  currentMission: null,
  runId: null,
  lastResult: null,
  player: null,
  daily: null,
  hud: { fuel: 1, hull: 1, altitude: 0, objective: "", progress: 0 },
  setMissions: (missions) => set({ missions, missionRefreshError: null }),
  setCurrentMission: (currentMission) => set({ currentMission }),
  setRunId: (runId) => set({ runId }),
  setLastResult: (lastResult) => set({ lastResult }),
  setPlayer: (player) => set({ player }),
  setDaily: (daily) => set({ daily }),
  setHud: (h) => set((s) => ({ hud: { ...s.hud, ...h } })),
}));
