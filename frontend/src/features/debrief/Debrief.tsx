import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";

export default function Debrief() {
  const { slug } = useParams<{ slug: string }>();
  const result = useGameStore((s) => s.lastResult);
  const runId = useGameStore((s) => s.runId);
  const setMissions = useGameStore((s) => s.setMissions);
  const [replayCount, setReplayCount] = useState(0);

  const won = result?.status === "won";
  const medal = result?.medal;

  useEffect(() => {
    api.listMissions().then((r) => setMissions(r.missions));
    if (runId) {
      api.getRunResult(runId).then((r) => setReplayCount(r.replay_frames ?? 0));
    }
  }, [runId, setMissions]);

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "2rem", textAlign: "center" }}>
      <h1 style={{ color: won ? "var(--success)" : "var(--danger)" }}>
        {won ? "Mission Complete" : "Mission Failed"}
      </h1>
      {medal && (
        <div className={`medal-reveal medal-${medal}`}>
          <span className="medal-icon">{medal === "gold" ? "★" : medal === "silver" ? "◆" : "●"}</span>
          <p>{medal.toUpperCase()} MEDAL</p>
        </div>
      )}
      <div className="panel" style={{ textAlign: "left" }}>
        <p>
          <strong>Score:</strong> {result?.score ?? 0}
        </p>
        <p>
          <strong>Flight time:</strong> {result?.telemetry?.elapsed?.toFixed(1) ?? "—"}s
        </p>
        <p>
          <strong>Fuel remaining:</strong> {((result?.telemetry?.fuel_pct ?? 0) * 100).toFixed(0)}%
        </p>
        <p>
          <strong>Hull:</strong> {((result?.telemetry?.hull_pct ?? 0) * 100).toFixed(0)}%
        </p>
        {replayCount > 0 && (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            Replay saved ({replayCount} keyframes)
          </p>
        )}
      </div>
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/missions" className="btn" style={{ textDecoration: "none" }}>
          Mission Select
        </Link>
        <Link to="/crafting" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Crafting
        </Link>
        {!won && (
          <Link to={`/missions/${slug}/hangar`} className="btn btn-secondary" style={{ textDecoration: "none" }}>
            Retry
          </Link>
        )}
      </div>
    </main>
  );
}
