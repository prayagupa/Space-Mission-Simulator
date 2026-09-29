import { Link, useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import DataState from "../../components/DataState";
import MissionArtwork from "../../components/MissionArtwork";
import MissionSteps from "../../components/MissionSteps";
import { useMission } from "../../shared/useMission";
import { difficultyLabel, missionName, missionPresentation } from "../../shared/missionPresentation";

function BriefingText({ text }: { text: string }) {
  return <>{text.trim().split("\n").filter(Boolean).map((line, index) => <p key={index}>{line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => part.startsWith("**") && part.endsWith("**") ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}</p>)}</>;
}

export default function Briefing() {
  const { slug } = useParams<{ slug: string }>();
  const { mission, error, retry } = useMission(slug);
  const details = missionPresentation(slug ?? "");

  return (
    <main className="page preflight-page">
      <Link to="/missions" className="back-link"><Icon name="arrow-left" size={16} />All missions</Link>
      <MissionSteps current={0} />
      {mission ? (
        <>
          <div className="page-heading"><div><div className="eyebrow">{details.category.toUpperCase()} / MISSION BRIEFING</div><h1>{missionName(mission.name)}<span className="heading-dot">.</span></h1><p>{details.description}</p></div><span className="pill pill-success"><span className="status-dot" />Ready for your command</span></div>
          <div className="briefing-grid">
            <div className="briefing-main">
              <section className="panel objective-panel"><span className="objective-icon"><Icon name="target" size={27} /></span><div><div className="eyebrow">YOUR MISSION OBJECTIVE</div><h2>{mission.objective.label || "Complete the mission"}</h2><p>Keep an eye on the objective meter during your flight.</p></div></section>
              <section className="panel briefing-copy"><div className="panel-heading"><Icon name="book" size={19} /><h2>A message from mission control</h2></div><BriefingText text={mission.briefing} /><div className="briefing-note"><Icon name="info" size={18} /><p>Take your time. You can return to the hangar and try again after any flight.</p></div></section>
              <div className="preflight-actions"><Link to={`/missions/${mission.slug}/hangar`} className="btn">Configure your craft<Icon name="arrow-right" size={18} /></Link><span>Next up: make this spacecraft yours.</span></div>
            </div>
            <aside className="mission-dossier panel">
              <MissionArtwork scene={details.scene} />
              <div className="dossier-content"><span className="eyebrow">FLIGHT PLAN</span><dl><div><dt>Destination</dt><dd><Icon name="globe" size={16} />{details.destination}</dd></div><div><dt>Difficulty</dt><dd><Icon name="signal" size={16} />{difficultyLabel(mission.difficulty)}</dd></div><div><dt>Loadout budget</dt><dd><Icon name="layers" size={16} />{mission.loadout.mass_budget} t</dd></div></dl><div className="dossier-controls"><span className="eyebrow">YOUR COCKPIT, SIMPLIFIED</span><div><kbd>A</kbd><kbd>W</kbd><kbd>D</kbd><span>Rotate. Thrust. Explore.</span></div><Link to="/guide" className="text-link">Need a quick refresher?<Icon name="arrow-up-right" size={14} /></Link></div></div>
            </aside>
          </div>
        </>
      ) : <DataState error={error} message="Preparing your mission briefing..." onRetry={retry} />}
    </main>
  );
}
