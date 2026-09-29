import { useId } from "react";
import type { MissionSummary } from "../../shared/api";
import { missionName } from "../../shared/missionPresentation";

type Props = {
  missions: MissionSummary[];
  onSelect: (slug: string) => void;
};

export default function GalaxyMap({ missions, onSelect }: Props) {
  const id = useId();
  const position = (mission: MissionSummary, index: number) => ({
    x: Math.min(710, Math.max(90, mission.map_position?.x ?? 120 + index * 140)),
    y: Math.min(350, Math.max(80, mission.map_position?.y ?? 180 + (index % 2) * 80)),
  });

  return (
    <svg viewBox="0 0 800 440" className="galaxy-map" role="group" aria-label="Mission waypoints. Use Tab and Enter to select an available mission.">
      <defs>
        <radialGradient id={`${id}-glow`}><stop offset="0%" stopColor="#1f344e" stopOpacity=".7" /><stop offset="100%" stopColor="#0d121c" stopOpacity="0" /></radialGradient>
        <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0v40" fill="none" stroke="#93accb" strokeOpacity=".035" /></pattern>
      </defs>
      <rect width="800" height="440" fill={`url(#${id}-grid)`} />
      <ellipse cx="400" cy="210" rx="375" ry="235" fill={`url(#${id}-glow)`} />
      {Array.from({ length: 75 }, (_, index) => <circle key={index} cx={(index * 137) % 800} cy={(index * 71) % 440} r={index % 4 === 0 ? 1.3 : .7} fill="#b7c9dd" opacity={.15 + index % 4 * .1} />)}
      {missions.flatMap((mission, index) => mission.prerequisites.map((slug) => {
        const sourceIndex = missions.findIndex((item) => item.slug === slug);
        if (sourceIndex === -1) return null;
        const from = position(missions[sourceIndex], sourceIndex);
        const to = position(mission, index);
        return <path key={`${slug}-${mission.slug}`} d={`M${from.x} ${from.y}C${from.x + 70} ${from.y - 45} ${to.x - 70} ${to.y - 45} ${to.x} ${to.y}`} fill="none" stroke={mission.unlocked ? "#f28866" : "#4d5d73"} strokeWidth="1.5" strokeDasharray={mission.unlocked ? undefined : "4 7"} opacity=".5" />;
      }))}
      {missions.map((mission, index) => {
        const { x, y } = position(mission, index);
        const color = mission.best_medal ? "#80c5a3" : mission.unlocked ? "#fc9675" : "#69778c";
        return (
          <g
            key={mission.slug}
            className={`map-node ${mission.unlocked ? "is-available" : "is-locked"}`}
            role="button"
            tabIndex={mission.unlocked ? 0 : -1}
            aria-disabled={!mission.unlocked}
            aria-label={`${missionName(mission.name)}${mission.best_medal ? `, ${mission.best_medal} medal` : ""}${mission.unlocked ? ", view briefing" : ", locked"}`}
            onClick={() => mission.unlocked && onSelect(mission.slug)}
            onKeyDown={(event) => {
              if (mission.unlocked && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onSelect(mission.slug);
              }
            }}
          >
            <title>{mission.name}{mission.unlocked ? " - view briefing" : " - complete prerequisite missions to unlock"}</title>
            <circle className="map-focus-ring" cx={x} cy={y} r="39" fill="none" stroke={color} strokeOpacity=".3" strokeDasharray="2 5" />
            <circle cx={x} cy={y} r="29" fill={color} fillOpacity=".07" stroke={color} strokeOpacity=".3" />
            <circle cx={x} cy={y} r="17" fill="#141e2d" stroke={color} strokeWidth="1.5" />
            <text x={x} y={y + 4} textAnchor="middle" fill={color} fontSize="11" fontFamily="monospace">{String(index + 1).padStart(2, "0")}</text>
            <text x={x} y={y + 58} textAnchor="middle" fill={mission.unlocked ? "#edf1f6" : "#9ca8b9"} fontSize="12" fontWeight="500">{missionName(mission.name)}</text>
            <text x={x} y={y + 76} textAnchor="middle" fill={color} fontSize="9" letterSpacing="1.5">{mission.best_medal ? `${mission.best_medal.toUpperCase()} MEDAL` : mission.unlocked ? "AWAITING LAUNCH" : "UNCHARTED"}</text>
          </g>
        );
      })}
    </svg>
  );
}
