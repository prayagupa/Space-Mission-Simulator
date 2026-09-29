import { useEffect, useState } from "react";
import { api } from "./api";
import { useGameStore } from "../store/gameStore";

export function useDailyChallenge() {
  const daily = useGameStore((s) => s.daily);
  const setDaily = useGameStore((s) => s.setDaily);
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStatus !== "ready") return;
    let active = true;
    setError("");
    api.dailyChallenge().then((result) => {
      if (active) setDaily(result);
    }).catch(() => {
      if (active) setError("Today's challenge is unavailable. You can still explore your regular missions.");
    });
    return () => { active = false; };
  }, [sessionStatus, setDaily]);

  return { daily: error ? null : daily, error };
}
