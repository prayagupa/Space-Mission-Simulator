import type { MissionScene } from "../shared/missionPresentation";
import Icon from "./Icon";

export default function MissionArtwork({ scene }: { scene: MissionScene }) {
  return (
    <div className={`mission-art art-${scene}`} aria-hidden="true">
      <div className="art-stars" />
      <div className="art-planet" />
      <svg className="art-trajectory" viewBox="0 0 360 180" fill="none">
        <path d="M-30 180C80 175 66 52 180 47S311 152 395 20" stroke="currentColor" strokeDasharray="3 6" />
        <ellipse cx="195" cy="130" rx="155" ry="47" transform="rotate(-23 195 130)" stroke="currentColor" opacity=".35" />
        <circle cx="180" cy="47" r="4" fill="currentColor" />
      </svg>
      <Icon name={scene === "lunar" ? "target" : "rocket"} className="art-spacecraft" size={29} />
      {(scene === "debris" || scene === "asteroid") && (
        <div className="art-rocks"><i /><i /><i /><i /><i /></div>
      )}
      <span className="art-cross cross-one">+</span>
      <span className="art-cross cross-two">+</span>
    </div>
  );
}
