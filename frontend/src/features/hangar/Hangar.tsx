import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";

export default function Hangar() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const mission = useGameStore((s) => s.currentMission);
  const setRunId = useGameStore((s) => s.setRunId);
  const [launching, setLaunching] = useState(false);
  const [modules, setModules] = useState<string[]>(["standard_tank", "reinforced_hull"]);

  const mass = modules.reduce((sum, id) => {
    const m = mission?.loadout.modules.find((x) => x.id === id);
    return sum + (m?.mass ?? 0);
  }, 20);
  const budget = mission?.loadout.mass_budget ?? 100;

  const toggle = (id: string) => {
    setModules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const launch = async () => {
    if (!slug || mass > budget) return;
    setLaunching(true);
    try {
      const run = await api.createRun(slug, { modules });
      setRunId(run.run_id);
      navigate(`/missions/${slug}/flight`);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem" }}>
      <Link to={`/missions/${slug}/briefing`} style={{ color: "var(--muted)", textDecoration: "none" }}>
        ← Briefing
      </Link>
      <h1 style={{ marginTop: "1rem" }}>Hangar</h1>
      <div className="panel">
        <p style={{ color: "var(--muted)" }}>Select modules (MVP — cosmetic loadout).</p>
        <p>
          Mass: <strong style={{ color: mass > budget ? "var(--danger)" : "var(--success)" }}>{mass}</strong> /{" "}
          {budget}
        </p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {mission?.loadout.modules.map((mod) => (
            <li key={mod.id} style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modules.includes(mod.id)}
                  onChange={() => toggle(mod.id)}
                />
                {mod.name} ({mod.mass}t)
              </label>
            </li>
          ))}
        </ul>
      </div>
      <button
        className="btn"
        style={{ marginTop: "1.5rem" }}
        disabled={launching || mass > budget}
        onClick={launch}
      >
        {launching ? "Launching…" : "Launch Mission"}
      </button>
    </main>
  );
}
