import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";
import { useMission } from "../../shared/useMission";
import { missionName } from "../../shared/missionPresentation";
import Icon, { type IconName } from "../../components/Icon";
import DataState from "../../components/DataState";
import MissionSteps from "../../components/MissionSteps";
import Spacecraft from "../../components/Spacecraft";
import { loadFlightView } from "../flight/loadFlightView";

const moduleDetails: Record<string, { icon: IconName; description: string }> = {
  standard_tank: { icon: "fuel", description: "The fuel reserve for your next great adventure." },
  reinforced_hull: { icon: "shield", description: "Added protection for the unexpected." },
  extended_tank: { icon: "fuel", description: "Extra fuel to take your journey further." },
  turbo_thruster: { icon: "zap", description: "A little more power when it matters most." },
};

export default function Hangar() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { mission, error, retry } = useMission(slug);
  const setRunId = useGameStore((s) => s.setRunId);
  const setLastResult = useGameStore((s) => s.setLastResult);
  const setHud = useGameStore((s) => s.setHud);
  const [launching, setLaunching] = useState(false);
  const launchLock = useRef(false);
  const mounted = useRef(true);
  const launchGeneration = useRef(0);
  const [launchError, setLaunchError] = useState("");
  const [modules, setModules] = useState<string[]>(["standard_tank", "reinforced_hull"]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    launchGeneration.current += 1;
    setModules(["standard_tank", "reinforced_hull"]);
    setLaunchError("");
  }, [slug]);

  const selectedModules = mission?.loadout.modules.filter((module) => modules.includes(module.id)) ?? [];
  const mass = selectedModules.reduce((sum, module) => sum + module.mass, 20);
  const budget = mission?.loadout.mass_budget ?? 100;
  const overBudget = mass > budget;

  const launch = async () => {
    if (!mission || mission.slug !== slug || overBudget || launchLock.current) return;
    const generation = launchGeneration.current;
    const ownsLaunch = () => mounted.current && launchGeneration.current === generation;
    launchLock.current = true;
    setLaunching(true);
    setLaunchError("");
    try {
      await loadFlightView();
      if (!ownsLaunch()) return;
      const run = await api.createRun(mission.slug, { modules: selectedModules.map((module) => module.id) });
      if (!ownsLaunch()) {
        await api.cancelUnstartedRun(run.run_id);
        return;
      }
      setRunId(run.run_id);
      setLastResult(null);
      setHud({ fuel: 1, hull: 1, altitude: 0, objective: mission.objective.label ?? "", progress: 0 });
      navigate(`/missions/${mission.slug}/flight`);
    } catch (reason) {
      if (ownsLaunch()) setLaunchError(reason instanceof Error ? reason.message : "Launch could not be completed. Please try again.");
      else console.error("The abandoned launch could not be completed or cancelled.", reason);
    } finally {
      launchLock.current = false;
      if (mounted.current) setLaunching(false);
    }
  };

  return (
    <main className="page preflight-page">
      <Link to={`/missions/${slug}/briefing`} className="back-link"><Icon name="arrow-left" size={16} />Mission briefing</Link>
      <MissionSteps current={1} />
      <div className="page-heading"><div><div className="eyebrow">PRE-FLIGHT CONFIGURATION</div><h1>Built for your next adventure<span className="heading-dot">.</span></h1><p>{mission ? `Prepare your spacecraft for ${missionName(mission.name)}.` : "Your flight begins with a well-prepared spacecraft."}</p></div></div>
      {mission ? (
        <div className="hangar-grid">
          <section className="craft-preview"><div className="craft-preview-heading"><span className="eyebrow">ORBITAL / EXPLORER</span><span className="pill"><span className="status-dot" />{launching ? "Preparing launch" : "In the hangar"}</span></div><Spacecraft /><div className="craft-preview-footer"><span><small>CRAFT MASS</small>{mass} <em>t</em></span><span><small>MODULES FITTED</small>{String(selectedModules.length).padStart(2, "0")}</span><span><small>FLIGHT SYSTEM</small><em className="craft-system">MANUAL</em></span></div><span className="blueprint-caption">EXPLORER CLASS / CONFIGURATION VIEW</span></section>
          <div className="loadout-column">
            <section className="panel loadout-panel">
              <div className="panel-heading"><Icon name="layers" size={20} /><h2>Make it mission-ready</h2><span className="panel-heading-note">{mission.loadout.modules.length} modules</span></div>
              <p className="panel-description">A little preparation goes a long way. Select the modules you want on board.</p>
              <fieldset className="module-options" disabled={launching}><legend className="sr-only">Spacecraft modules</legend>{mission.loadout.modules.map((module) => {
                const details = moduleDetails[module.id];
                const selected = modules.includes(module.id);
                return <label className={`module-option ${selected ? "is-selected" : ""}`} key={module.id}><input type="checkbox" checked={selected} onChange={() => setModules((previous) => previous.includes(module.id) ? previous.filter((id) => id !== module.id) : [...previous, module.id])} /><span className="module-icon"><Icon name={details?.icon ?? "layers"} size={23} /></span><span className="module-info"><strong>{module.name}</strong><small>{details?.description ?? "An upgrade for your spacecraft."}</small></span><span className="module-mass">{module.mass} t</span><span className="custom-checkbox">{selected && <Icon name="check" size={13} />}</span></label>;
              })}</fieldset>
              <div className="mass-budget"><div><span>Mass budget<small>Includes the 20 t base spacecraft</small></span><strong className={overBudget ? "text-danger" : ""}>{mass} <span>/ {budget} t</span></strong></div><div className={`meter ${overBudget ? "is-danger" : ""}`} role="meter" aria-label="Spacecraft mass" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={Math.min(mass, budget)} aria-valuetext={`${mass} of ${budget} tonnes${overBudget ? ", over budget" : ""}`}><span style={{ width: `${Math.min(mass / budget * 100, 100)}%` }} /></div><p className={overBudget ? "text-danger" : ""}>{overBudget ? "Over budget. Remove a module before launch." : `${budget - mass} t available. Looking good, Commander.`}</p></div>
            </section>
            <Link to="/crafting" className="upgrade-link"><span><Icon name="wrench" size={19} /><span>A little extra edge?<small>Explore upgrades in the crafting bay.</small></span></span><Icon name="arrow-up-right" size={18} /></Link>
            {launchError && <p className="notice notice-error" role="alert">{launchError}</p>}
            <button className="btn launch-button" disabled={launching || overBudget} onClick={() => void launch()}><Icon name="rocket" size={21} />{launching ? "Preparing your launch..." : "Launch mission"}<Icon name="arrow-right" size={19} /></button>
            <p className="launch-hint">You're in control. <kbd>W</kbd> to thrust, <kbd>A</kbd><kbd>D</kbd> to steer.</p>
          </div>
        </div>
      ) : <DataState error={error} message="Opening the hangar doors..." onRetry={retry} />}
    </main>
  );
}
