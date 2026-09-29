import { useEffect, useState } from "react";
import { api, type MissionDetail } from "./api";
import { useGameStore } from "../store/gameStore";

export function useMission(slug: string | undefined) {
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const initialize = useGameStore((s) => s.initialize);
  const setCurrentMission = useGameStore((s) => s.setCurrentMission);
  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug || sessionStatus !== "ready") return;
    let active = true;
    setMission(null);
    setError("");
    api.getMission(slug).then((result) => {
      if (!active) return;
      setMission(result);
      setCurrentMission(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load this mission.");
    });
    return () => { active = false; };
  }, [slug, sessionStatus, setCurrentMission, attempt]);

  return {
    mission: sessionStatus === "ready" && mission?.slug === slug ? mission : null,
    error: sessionStatus === "error" ? "Reconnect to mission control to receive this flight plan." : error,
    retry: () => {
      if (sessionStatus === "error") void initialize();
      else setAttempt((value) => value + 1);
    },
  };
}
