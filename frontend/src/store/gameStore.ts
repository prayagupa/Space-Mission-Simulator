import { create } from "zustand";
import type { AuthProfile, DailyChallenge, MissionDetail, MissionSummary, RunResult } from "../shared/api";

type GameStore = {
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

export const useGameStore = create<GameStore>((set) => ({
  missions: [],
  currentMission: null,
  runId: null,
  lastResult: null,
  player: null,
  daily: null,
  hud: { fuel: 1, hull: 1, altitude: 0, objective: "", progress: 0 },
  setMissions: (missions) => set({ missions }),
  setCurrentMission: (currentMission) => set({ currentMission }),
  setRunId: (runId) => set({ runId }),
  setLastResult: (lastResult) => set({ lastResult }),
  setPlayer: (player) => set({ player }),
  setDaily: (daily) => set({ daily }),
  setHud: (h) => set((s) => ({ hud: { ...s.hud, ...h } })),
}));
