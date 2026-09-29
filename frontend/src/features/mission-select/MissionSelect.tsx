import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../../components/Icon";
import MissionCard from "../../components/MissionCard";
import DataState from "../../components/DataState";
import { useGameStore } from "../../store/gameStore";
import { useDailyChallenge } from "../../shared/useDailyChallenge";
import { missionName } from "../../shared/missionPresentation";
import GalaxyMap from "./GalaxyMap";

type Filter = "all" | "available" | "completed";

export default function MissionSelect() {
  const missions = useGameStore((s) => s.missions);
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const { daily, error } = useDailyChallenge();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [search, setSearch] = useState("");
  const filtered = missions.filter((mission) =>
    (filter === "all" || (filter === "available" ? mission.unlocked : !!mission.best_medal)) &&
    mission.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const dailyMission = missions.find((mission) => mission.slug === daily?.slug);
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All missions", count: missions.length },
    { value: "available", label: "Available", count: missions.filter((mission) => mission.unlocked).length },
    { value: "completed", label: "Completed", count: missions.filter((mission) => mission.best_medal).length },
  ];

  return (
    <main className="page">
      <div className="page-heading"><div><div className="eyebrow">CHART YOUR OWN COURSE</div><h1>Choose your next frontier<span className="heading-dot">.</span></h1><p>From your first ignition to a lunar landing. Every mission takes you further.</p></div><div className="view-toggle" role="group" aria-label="Mission view"><button aria-label="Mission grid" aria-pressed={view === "grid"} onClick={() => setView("grid")}><Icon name="grid" size={17} /></button><button aria-label="Galaxy map" aria-pressed={view === "map"} onClick={() => setView("map")}><Icon name="orbit" size={20} /></button></div></div>
      <section className="sector-banner">
        <div className="sector-emblem"><Icon name="globe" size={35} /></div>
        <div><span className="eyebrow">EXPLORATION SECTOR 01</span><h2>The Sol system</h2><p>A familiar home. An extraordinary place to begin.</p></div>
        <div className="sector-progress"><span>{missions.filter((mission) => mission.best_medal).length}<small> / {missions.length}</small></span><p>FRONTIERS EXPLORED</p></div>
        <div className="sector-orbits" aria-hidden="true"><i /><i /><i /></div>
      </section>
      <div className="mission-toolbar">
        <div className="filter-tabs" role="group" aria-label="Filter missions">{filters.map((item) => <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}<span>{String(item.count).padStart(2, "0")}</span></button>)}</div>
        <label className="search-field"><Icon name="search" size={16} /><span className="sr-only">Search missions</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a mission..." /></label>
      </div>
      {sessionStatus !== "ready" ? <DataState error={sessionStatus === "error" ? "Reconnect to mission control to load your missions." : undefined} /> : (
        <>
          <p className="results-count" role="status">{filtered.length} {filtered.length === 1 ? "mission" : "missions"} in your flight path</p>
          {!filtered.length ? <div className="empty-state"><Icon name="orbit" size={36} /><h3>{filter === "completed" && !search ? "Your first achievement is out there." : "No missions found."}</h3><p>{filter === "completed" && !search ? "Complete a mission to see it here. Every explorer starts with one." : "Try another mission name or explore all your available frontiers."}</p><button className="btn btn-secondary" onClick={() => { setFilter("all"); setSearch(""); }}>Explore all missions<Icon name="arrow-right" size={16} /></button></div> : view === "grid" ? (
            <div className="mission-grid catalog-grid">{filtered.map((mission) => <MissionCard key={mission.slug} mission={mission} index={missions.indexOf(mission)} missions={missions} />)}</div>
          ) : (
            <section className="galaxy-panel" aria-label="Galaxy map">
              <div className="map-heading"><span className="eyebrow">SOL SYSTEM / MISSION NETWORK</span><div className="map-legend"><span><i className="legend-available" />Available</span><span><i className="legend-complete" />Completed</span><span><i />Locked</span></div></div>
              <GalaxyMap missions={filtered} onSelect={(slug) => navigate(`/missions/${slug}/briefing`)} />
              <ul className="map-mission-list" aria-label="Mission waypoint list">{filtered.map((mission) => <li key={mission.slug}>{mission.unlocked ? <Link to={`/missions/${mission.slug}/briefing`}><span><strong>{missionName(mission.name)}</strong><small>{mission.best_medal ? `${mission.best_medal} medal earned` : "Available for launch"}</small></span><Icon name="arrow-right" size={18} /></Link> : <div><span><strong>{missionName(mission.name)}</strong><small>Complete {mission.prerequisites.map((slug) => missionName(missions.find((item) => item.slug === slug)?.name ?? slug.replaceAll("-", " "))).join(" and ")} to unlock</small></span><Icon name="lock" size={15} /></div>}</li>)}</ul>
              <p className="map-hint"><Icon name="info" size={15} />Select a lit waypoint to view its briefing. Complete missions to chart new routes.</p>
            </section>
          )}
        </>
      )}
      {error && <p className="notice notice-warning" role="status">{error}</p>}
      {dailyMission && <div className="daily-strip"><span className="daily-strip-icon"><Icon name="sparkles" size={22} /></span><div><span className="eyebrow">TODAY'S DAILY CHALLENGE</span><strong>{missionName(dailyMission.name)}</strong><p>{dailyMission.unlocked ? daily?.description : "Keep exploring to unlock this challenge."}</p></div><span className="bonus-badge">{daily?.bonus_multiplier}x bonus</span>{dailyMission.unlocked ? <Link to={`/missions/${dailyMission.slug}/briefing`} className="text-link">Accept challenge<Icon name="arrow-right" size={17} /></Link> : <span className="locked-label"><Icon name="lock" size={15} />Not yet unlocked</span>}</div>}
    </main>
  );
}
