const API = "/api/v1";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status}). Please try again.`;
    const text = await res.text();
    try {
      const body: unknown = JSON.parse(text);
      if (typeof body === "object" && body !== null && "detail" in body) {
        if (typeof body.detail === "string") message = body.detail;
        else if (Array.isArray(body.detail)) message = "Please check your details and try again.";
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    throw new Error(message);
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
  objective: { label?: string; type?: string; altitude_min_km?: number };
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

/** Release an allocated run before its flight socket takes ownership. */
function cancelUnstartedRun(runId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl(`/ws/mission/${encodeURIComponent(runId)}`));
    let abortSent = false;
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => finish(new Error("Mission control couldn't confirm cancellation. Check your connection before launching again.")), 10_000);
    socket.onopen = () => {
      abortSent = true;
      socket.send(JSON.stringify({ type: "abort" }));
    };
    socket.onclose = (event) => finish(abortSent && event.wasClean && event.code === 1000 ? undefined : new Error("The abandoned launch couldn't be released. Check your connection before launching again."));
    socket.onerror = () => finish(new Error("Mission control couldn't be reached to cancel the abandoned launch."));
  });
}

export const api = {
  ensureGuest: () => fetchJson<{ player_id: string }>("/session/guest", { method: "POST" }),
  listMissions: () => fetchJson<{ missions: MissionSummary[] }>("/missions"),
  getMission: (slug: string) => fetchJson<MissionDetail>(`/missions/${slug}`),
  createRun: (slug: string, loadout: { modules: string[] }) =>
    fetchJson<{ run_id: string; ws_url: string }>(`/missions/${slug}/runs`, {
      method: "POST",
      body: JSON.stringify({ loadout: { modules: loadout.modules } }),
    }),
  cancelUnstartedRun,
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
