const API = "/api/v1";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type MissionSummary = {
  slug: string;
  name: string;
  difficulty: number;
  unlocked: boolean;
  best_medal: string | null;
  prerequisites: string[];
  map_position: { x: number; y: number };
};

export type MissionDetail = {
  slug: string;
  name: string;
  difficulty: number;
  briefing: string;
  objective: { label?: string; type?: string };
  loadout: { modules: { id: string; name: string; mass: number }[]; mass_budget: number };
};

export type RunResult = {
  run_id: string;
  status: string;
  score: number | null;
  medal: string | null;
  telemetry: { elapsed?: number; fuel_pct?: number; hull_pct?: number };
  replay_frames?: number;
};

export type AuthProfile = {
  player_id: string;
  email: string | null;
  display_name: string | null;
  is_guest: boolean;
};

export type DailyChallenge = {
  date: string;
  slug: string | null;
  name: string | null;
  bonus_multiplier: number;
  description: string;
};

export type CraftRecipe = {
  id: string;
  name: string;
  cost_scrap: number;
  crafted: boolean;
  can_craft: boolean;
  reason: string | null;
};

export const api = {
  ensureGuest: () => fetchJson<{ player_id: string }>("/session/guest", { method: "POST" }),
  listMissions: () => fetchJson<{ missions: MissionSummary[] }>("/missions"),
  getMission: (slug: string) => fetchJson<MissionDetail>(`/missions/${slug}`),
  createRun: (slug: string, loadout: { modules: string[] }) =>
    fetchJson<{ run_id: string; ws_url: string }>(`/missions/${slug}/runs`, {
      method: "POST",
      body: JSON.stringify({ loadout: { modules: loadout.modules } }),
    }),
  getRunResult: (runId: string) => fetchJson<RunResult>(`/runs/${runId}/result`),
  getRunReplay: (runId: string) => fetchJson<{ frames: unknown[] }>(`/runs/${runId}/replay`),
  getProgress: () => fetchJson<{ player_id: string; missions: unknown[] }>("/progress"),
  me: () => fetchJson<AuthProfile>("/auth/me"),
  register: (email: string, password: string, displayName?: string) =>
    fetchJson<AuthProfile>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name: displayName }),
    }),
  login: (email: string, password: string) =>
    fetchJson<AuthProfile>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => fetchJson<{ message: string }>("/auth/logout", { method: "POST" }),
  dailyChallenge: () => fetchJson<DailyChallenge>("/daily-challenge"),
  craftingRecipes: () =>
    fetchJson<{ scrap: number; crafted: string[]; recipes: CraftRecipe[] }>("/crafting/recipes"),
  craft: (recipeId: string) =>
    fetchJson<{ crafted: string[]; scrap: number }>("/crafting/craft", {
      method: "POST",
      body: JSON.stringify({ recipe_id: recipeId }),
    }),
};

export function wsUrl(path: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}
