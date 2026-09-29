import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import Icon, { type IconName } from "./Icon";

export default function AppLayout({ children, onContentReady }: { children: ReactNode; onContentReady: (element: HTMLElement | null) => void }) {
  const { pathname } = useLocation();
  const player = useGameStore((s) => s.player);
  const missions = useGameStore((s) => s.missions);
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const initialize = useGameStore((s) => s.initialize);
  const missionRefreshError = useGameStore((s) => s.missionRefreshError);
  const refreshMissions = useGameStore((s) => s.refreshMissions);
  const nextMission = missions.find((mission) => mission.unlocked && !mission.best_medal) ?? missions.find((mission) => mission.unlocked);
  const inHangar = pathname.endsWith("/hangar");
  const navigation: { label: string; icon: IconName; to: string; active: boolean; count?: number }[] = [
    { label: "Overview", icon: "grid", to: "/", active: pathname === "/" },
    { label: "Missions", icon: "orbit", to: "/missions", active: pathname.startsWith("/missions") && !inHangar, count: missions.length },
    { label: "Hangar", icon: "rocket", to: nextMission ? `/missions/${nextMission.slug}/hangar` : "/missions", active: inHangar },
    { label: "Crafting bay", icon: "wrench", to: "/crafting", active: pathname === "/crafting" },
  ];
  const pageName = navigation.find((item) => item.active)?.label ?? (pathname === "/guide" ? "Flight guide" : "Commander profile");
  const commander = player?.display_name || (player?.is_guest ? "Guest commander" : "Commander");
  const initials = commander.split(/\s+/).map((word) => word[0]).slice(0, 2).join("").toUpperCase();

  const navItems = navigation.map((item) => (
    <Link key={item.label} to={item.to} className={`nav-item ${item.active ? "is-active" : ""}`} aria-current={item.active ? "page" : undefined}>
      <Icon name={item.icon} size={19} /><span>{item.label}</span>
      {!!item.count && <span className="nav-count">{String(item.count).padStart(2, "0")}</span>}
    </Link>
  ));

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="Orbital mission control home">
          <span className="brand-mark"><Icon name="orbit" size={29} /></span>
          <span className="brand-type">ORBITAL<small>SPACE MISSION SIMULATOR</small></span>
        </Link>
        <p className="nav-label">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">{navItems}</nav>
        <p className="nav-label nav-label-secondary">COMMANDER RESOURCES</p>
        <nav className="secondary-nav" aria-label="Resources">
          <NavLink to="/guide" className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}><Icon name="book" size={19} />Flight guide<Icon name="arrow-up-right" size={14} /></NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}><Icon name="user" size={19} />Your account</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="explorer-note">
            <span className="eyebrow"><span className="status-dot" />EXPLORER PROGRAM</span>
            <Icon name="orbit" className="explorer-orbit" size={74} />
            <h3>Small steps.<br />Infinite possibilities.</h3>
            <p>Your next discovery is<br />one launch away.</p>
            <Link to="/missions">Find your next mission<Icon name="arrow-right" size={15} /></Link>
          </div>
          <div className="sidebar-version"><span className="status-dot" />ORBITAL OS <span>v0.1</span></div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link to="/" className="mobile-brand" aria-label="Orbital home"><Icon name="orbit" size={25} />ORBITAL</Link>
          <div className="breadcrumbs"><span>Mission control</span><Icon name="chevron" size={13} /><strong>{pageName}</strong></div>
          <div className="topbar-actions">
            <span className={`connection-status ${sessionStatus === "ready" ? "is-online" : sessionStatus === "error" ? "is-offline" : ""}`} role="status">
              <span className="status-dot" />{sessionStatus === "ready" ? "SYSTEMS ONLINE" : sessionStatus === "error" ? "CONNECTION LOST" : "CONNECTING"}
            </span>
            <span className="topbar-divider" />
            <Link to="/guide" className="icon-button guide-link" aria-label="Open flight guide" title="Flight guide"><Icon name="book" size={19} /></Link>
            <Link to="/settings" className="profile-link" aria-label={`${commander}, open account`}>
              <span className="avatar">{initials}</span><span className="profile-name">{commander}<small>{player?.is_guest ? "EXPLORER IN TRAINING" : "EXPLORER PROFILE"}</small></span><Icon name="chevron" size={13} />
            </Link>
          </div>
        </header>
        {sessionStatus === "error" && (
          <div className="connection-banner" role="alert">
            <Icon name="signal" /><div><strong>Mission control is offline.</strong> We couldn't load your progress. Check your connection and make sure the API is running.</div>
            <button className="btn btn-small btn-secondary" onClick={() => void initialize()}><Icon name="refresh" size={15} />Reconnect</button>
          </div>
        )}
        {sessionStatus === "ready" && missionRefreshError && (
          <div className="connection-banner" role="alert">
            <Icon name="refresh" /><div><strong>Your mission progress couldn't refresh.</strong> Unlocks and statistics may be out of date. {missionRefreshError}</div>
            <button className="btn btn-small btn-secondary" onClick={() => void refreshMissions()}>Refresh progress</button>
          </div>
        )}
        <div ref={onContentReady} id="main-content" className="page-content" tabIndex={-1}>{children}</div>
        <footer className="workspace-footer"><span><Icon name="orbit" size={14} />Built for the explorer in you.</span><span>PLAN. LAUNCH. DISCOVER.<i />ORBITAL / 01</span></footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{navItems}</nav>
    </>
  );
}
