import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";

export default function Briefing() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const setCurrentMission = useGameStore((s) => s.setCurrentMission);
  const [briefing, setBriefing] = useState("");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");

  useEffect(() => {
    if (!slug) return;
    api.getMission(slug).then((m) => {
      setCurrentMission(m);
      setBriefing(m.briefing);
      setName(m.name);
      setObjective(m.objective?.label ?? "Complete the mission");
    });
  }, [slug, setCurrentMission]);

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem" }}>
      <Link to="/missions" style={{ color: "var(--muted)", textDecoration: "none" }}>
        ← Missions
      </Link>
      <h1 style={{ marginTop: "1rem" }}>{name || "Briefing"}</h1>
      <div className="panel">
        <h3 style={{ marginTop: 0, color: "var(--accent)" }}>Objective</h3>
        <p>{objective}</p>
        <h3 style={{ color: "var(--accent)" }}>Briefing</h3>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
            fontSize: "1rem",
            lineHeight: 1.6,
            margin: 0,
            color: "var(--text)",
          }}
        >
          {briefing.trim()}
        </pre>
      </div>
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
        <button className="btn" onClick={() => navigate(`/missions/${slug}/hangar`)}>
          Configure Craft →
        </button>
      </div>
    </main>
  );
}
