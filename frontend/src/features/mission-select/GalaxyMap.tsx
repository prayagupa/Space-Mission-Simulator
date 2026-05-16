import type { MissionSummary } from "../../shared/api";

type Props = {
  missions: MissionSummary[];
  onSelect: (slug: string) => void;
};

function medalClass(m: string | null) {
  if (m === "gold") return "medal-gold";
  if (m === "silver") return "medal-silver";
  if (m === "bronze") return "medal-bronze";
  return "";
}

export default function GalaxyMap({ missions, onSelect }: Props) {
  const w = 800;
  const h = 480;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 900, height: "auto", display: "block" }}>
      <defs>
        <radialGradient id="nebula" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a3a5c" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0a0e1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill="#0a0e1a" />
      <ellipse cx={400} cy={240} rx={350} ry={200} fill="url(#nebula)" />
      {Array.from({ length: 80 }).map((_, i) => (
        <circle
          key={i}
          cx={(i * 97) % w}
          cy={(i * 53) % h}
          r={(i % 3) * 0.5 + 0.5}
          fill="#aabbdd"
          opacity={0.3 + (i % 5) * 0.1}
        />
      ))}
      {missions.map((m, i) => {
        const x = m.map_position?.x ?? 120 + i * 140;
        const y = m.map_position?.y ?? 200 + (i % 2) * 80;
        const locked = !m.unlocked;
        return (
          <g
            key={m.slug}
            style={{ cursor: locked ? "not-allowed" : "pointer" }}
            onClick={() => !locked && onSelect(m.slug)}
          >
            <circle cx={x} cy={y} r={28} fill={locked ? "#333" : "#00d4ff"} opacity={locked ? 0.3 : 0.5} />
            <circle cx={x} cy={y} r={12} fill={locked ? "#555" : "#00d4ff"} stroke="#fff" strokeWidth={1} />
            <text x={x} y={y + 44} textAnchor="middle" fill={locked ? "#666" : "#e8f0ff"} fontSize={11}>
              {m.name.length > 18 ? m.name.slice(0, 16) + "…" : m.name}
            </text>
            {m.best_medal && (
              <text x={x} y={y - 20} textAnchor="middle" className={medalClass(m.best_medal)} fontSize={10}>
                {m.best_medal}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
