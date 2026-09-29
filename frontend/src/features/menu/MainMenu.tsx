import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import MissionCard from "../../components/MissionCard";
import OrbitalScene from "../../components/OrbitalScene";
import { useGameStore } from "../../store/gameStore";
import { useDailyChallenge } from "../../shared/useDailyChallenge";
import { missionName } from "../../shared/missionPresentation";

export default function MainMenu() {
  const missions = useGameStore((s) => s.missions);
  const player = useGameStore((s) => s.player);
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const { daily, error: dailyError } = useDailyChallenge();
  const unlocked = missions.filter((mission) => mission.unlocked);
  const completed = missions.filter((mission) => mission.best_medal);
  const nextMission = unlocked.find((mission) => !mission.best_medal) ?? unlocked[0];
  const dailyMission = missions.find((mission) => mission.slug === daily?.slug);
  const ready = sessionStatus === "ready";
  const progress = missions.length ? Math.round(completed.length / missions.length * 100) : 0;
  const firstName = player?.display_name?.split(/\s+/)[0] || "Commander";

  return (
    <main className="page dashboard">
      <div className="page-heading">
        <div><div className="eyebrow">THE ADVENTURE STARTS WITH YOU</div><h1>Mission control<span className="heading-dot">.</span></h1><p>Welcome aboard, {firstName}. Your next frontier is waiting.</p></div>
        <span className="date-chip"><Icon name="calendar" size={15} />{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date())}</span>
      </div>

      <section className="mission-hero" aria-labelledby="hero-title">
        <div className="hero-stars" />
        <div className="hero-grid" />
        <OrbitalScene />
        <div className="hero-content">
          <span className="hero-eyebrow"><span className="status-dot" />YOUR UNIVERSE. YOUR MISSION.</span>
          <h2 id="hero-title">Go beyond<br /><span>what's possible.</span></h2>
          <p>Build your spacecraft. Find your orbit.<br />Turn a small ignition into an extraordinary journey.</p>
          <div className="hero-actions">
            <Link to={nextMission ? `/missions/${nextMission.slug}/briefing` : "/missions"} className="btn"><Icon name="rocket" size={18} />Start your mission<Icon name="arrow-right" size={17} /></Link>
            <Link to="/missions" className="text-link">Explore missions<Icon name="arrow-up-right" size={16} /></Link>
          </div>
          <div className="hero-footnote"><span className="mini-orbits"><i /><i /><i /></span>No experience needed. Just a little curiosity.</div>
        </div>
        <span className="hero-index">EXPLORATION PROGRAM / 001</span>
      </section>

      <section className="stats-grid" aria-label="Your mission progress">
        <div className="stat-card"><div className="stat-label">Missions unlocked<Icon name="orbit" /></div><div className="stat-value">{ready ? String(unlocked.length).padStart(2, "0") : "--"}<span>/ {ready ? String(missions.length).padStart(2, "0") : "--"}</span></div><span className="stat-note"><i className="status-dot" />{unlocked.length ? "Ready for liftoff" : "Awaiting mission data"}</span></div>
        <div className="stat-card"><div className="stat-label">Missions completed<Icon name="check" /></div><div className="stat-value">{ready ? String(completed.length).padStart(2, "0") : "--"}<span>missions</span></div><span className="stat-note">{completed.length ? "One frontier at a time" : "Your story starts here"}</span></div>
        <div className="stat-card"><div className="stat-label">Medals earned<Icon name="award" /></div><div className="stat-value">{ready ? String(completed.length).padStart(2, "0") : "--"}<span>medals</span></div><span className="stat-note medal-note"><i /><i /><i />Aim high. Fly brilliantly.</span></div>
        <div className="stat-card"><div className="stat-label">Campaign progress<Icon name="signal" /></div><div className="stat-value">{ready ? progress : "--"}<span>% explored</span></div><div className="segmented-progress" aria-hidden="true">{missions.map((mission) => <i key={mission.slug} className={mission.best_medal ? "is-filled" : ""} />)}</div></div>
      </section>

      <section className="dashboard-section" aria-labelledby="flight-path-title">
        <div className="section-heading"><div><h2 id="flight-path-title">Your flight path</h2><p>Big ambitions. One mission at a time.</p></div><Link to="/missions" className="text-link">View all missions<Icon name="arrow-right" size={16} /></Link></div>
        <div className="mission-grid">
          {missions.slice(0, 3).map((mission, index) => <MissionCard key={mission.slug} mission={mission} index={index} missions={missions} />)}
          {!ready && Array.from({ length: 3 }, (_, index) => <div key={index} className="mission-skeleton" aria-hidden="true"><div /><span /><span /><span /></div>)}
        </div>
        {ready && !missions.length && <div className="empty-state" role="status">No missions are available yet. Mission control will list them here when they're ready.</div>}
      </section>

      <div className="dashboard-bottom">
        <section className="daily-card" aria-labelledby="daily-title">
          <div className="daily-illustration" aria-hidden="true"><Icon name="orbit" size={67} /><span>24H</span></div>
          <div className="daily-content">
            <div className="eyebrow">A NEW DAY. A NEW FRONTIER.{daily?.slug && <span className="bonus-badge">{daily.bonus_multiplier}x bonus</span>}</div>
            <h3 id="daily-title">{daily?.name ? missionName(daily.name) : "Your daily challenge"}</h3>
            <p>{dailyError || (dailyMission && !dailyMission.unlocked ? "A challenge worth working toward. Progress through your missions to unlock it." : daily?.description || (ready ? "Receiving today's challenge from mission control." : "Connect to mission control to discover today's challenge."))}</p>
          </div>
          <Link to={dailyMission?.unlocked ? `/missions/${dailyMission.slug}/briefing` : "/missions"} className="daily-action" aria-label={dailyMission?.unlocked ? "View daily challenge briefing" : "Explore missions to unlock the daily challenge"}><Icon name="arrow-up-right" size={22} /></Link>
        </section>
        <Link className="flight-school-card" to="/guide">
          <div className="flight-school-heading"><Icon name="book" size={19} /><span>FIRST TIME IN THE COCKPIT?</span><Icon name="arrow-up-right" size={18} /></div>
          <h3>You've got this, Commander.</h3><p>Get flight-ready in three simple steps.</p>
          <span className="flight-school-link">Open the flight guide<Icon name="arrow-right" size={14} /></span>
        </Link>
      </div>
    </main>
  );
}
