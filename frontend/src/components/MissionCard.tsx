import { Link } from "react-router-dom";
import type { MissionSummary } from "../shared/api";
import { difficultyLabel, missionName, missionPresentation } from "../shared/missionPresentation";
import Icon from "./Icon";
import MissionArtwork from "./MissionArtwork";

export default function MissionCard({ mission, index, missions }: { mission: MissionSummary; index: number; missions: MissionSummary[] }) {
  const details = missionPresentation(mission.slug);
  const prerequisites = mission.prerequisites
    .map((slug) => missionName(missions.find((item) => item.slug === slug)?.name ?? slug.replaceAll("-", " ")))
    .join(" and ");
  const content = (
    <>
      <div className="mission-card-cover">
        <MissionArtwork scene={details.scene} />
        <span className="mission-category">{details.category}</span>
        <span className={`mission-availability ${mission.unlocked ? "is-available" : ""}`}>
          <Icon name={mission.best_medal ? "check" : mission.unlocked ? "arrow-up-right" : "lock"} size={15} />
          <span className="sr-only">{mission.best_medal ? "Completed" : mission.unlocked ? "Available" : "Locked"}</span>
        </span>
        <span className="mission-number">MISSION {String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="mission-card-body">
        <div className="mission-card-title">
          <h3>{missionName(mission.name)}</h3>
          {mission.best_medal && <Icon name="award" className={`medal-${mission.best_medal}`} size={19} />}
        </div>
        <p>{details.description}</p>
        <div className="mission-card-meta">
          <span><Icon name="globe" size={13} />{details.destination}</span>
          <span className="difficulty"><i className={`difficulty-bars level-${mission.difficulty}`}><b /><b /><b /><b /></i>{difficultyLabel(mission.difficulty)}</span>
        </div>
      </div>
      <div className="mission-card-action">
        {mission.unlocked ? <><span>{mission.best_medal ? "Fly again" : "View briefing"}</span><Icon name="arrow-right" size={17} /></> : <><Icon name="lock" size={13} /><span>Complete {prerequisites || "the previous mission"} to unlock</span></>}
      </div>
    </>
  );

  return mission.unlocked ? (
    <Link to={`/missions/${mission.slug}/briefing`} className="mission-card" aria-label={`${missionName(mission.name)}: ${mission.best_medal ? "fly again" : "view briefing"}`}>
      {content}
    </Link>
  ) : (
    <article className="mission-card is-locked" aria-label={`${missionName(mission.name)}: locked`}>{content}</article>
  );
}
