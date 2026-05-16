import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";
import GalaxyMap from "./GalaxyMap";

export default function MissionSelect() {
  const missions = useGameStore((s) => s.missions);
  const daily = useGameStore((s) => s.daily);
  const setMissions = useGameStore((s) => s.setMissions);
  const setDaily = useGameStore((s) => s.setDaily);
  const navigate = useNavigate();

  useEffect(() => {
    api.listMissions().then((r) => setMissions(r.missions));
    api.dailyChallenge().then(setDaily);
  }, [setMissions, setDaily]);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" }}>
      <Link to="/" style={{ color: "var(--muted)", textDecoration: "none" }}>
        ← Main Menu
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ marginTop: "1rem" }}>Galaxy Map</h1>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link to="/crafting" className="btn btn-secondary" style={{ textDecoration: "none" }}>
            Crafting
          </Link>
          <Link to="/settings" className="btn btn-secondary" style={{ textDecoration: "none" }}>
            Account
          </Link>
        </div>
      </div>

      {daily?.slug && (
        <div className="panel daily-banner" style={{ marginBottom: "1rem" }}>
          <strong style={{ color: "var(--gold)" }}>Daily Challenge</strong>
          <p style={{ margin: "0.25rem 0 0", color: "var(--muted)" }}>{daily.description}</p>
        </div>
      )}

      <GalaxyMap missions={missions} onSelect={(slug) => navigate(`/missions/${slug}/briefing`)} />

      <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {missions.map((m) => (
          <li key={m.slug} style={{ display: "flex", justifyContent: "space-between", opacity: m.unlocked ? 1 : 0.5 }}>
            <span>
              {m.name}
              {daily?.slug === m.slug && (
                <span style={{ marginLeft: 8, color: "var(--gold)", fontSize: "0.85rem" }}>★ Daily</span>
              )}
            </span>
            <button className="btn" style={{ padding: "0.35rem 0.8rem", fontSize: "0.9rem" }} disabled={!m.unlocked} onClick={() => navigate(`/missions/${m.slug}/briefing`)}>
              Go
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
