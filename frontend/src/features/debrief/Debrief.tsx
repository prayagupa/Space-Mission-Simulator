import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";
import Icon from "../../components/Icon";

export default function Debrief() {
  const { slug } = useParams<{ slug: string }>();
  const result = useGameStore((s) => s.lastResult);
  const runId = useGameStore((s) => s.runId);
  const setLastResult = useGameStore((s) => s.setLastResult);
  const refreshMissions = useGameStore((s) => s.refreshMissions);
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const won = result?.status === "won";

  useEffect(() => {
    if (!runId || sessionStatus !== "ready") return;
    let active = true;
    setError("");
    void refreshMissions();
    api.getRunResult(runId).then((report) => {
      if (!active) return;
      setLastResult(report);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Your flight report couldn't refresh.");
    });
    return () => { active = false; };
  }, [runId, sessionStatus, setLastResult, refreshMissions, attempt]);

  if (!result) return <main className="page"><div className="empty-state"><Icon name="book" size={38} /><h1>Your flight story is still unwritten.</h1><p>Complete a mission to see your score, medal, and flight report here.</p><Link className="btn" to="/missions">Find your first mission<Icon name="arrow-right" size={17} /></Link></div></main>;

  return (
    <main className="page debrief-page">
      <div className="debrief-heading"><span className="eyebrow">TRANSMISSION RECEIVED / FLIGHT DEBRIEF</span><div className={`debrief-emblem ${won ? "is-success" : ""}`}><Icon name={won ? "award" : "orbit"} size={54} /><i /><i /></div><span className={`pill ${won ? "pill-success" : ""}`}>{won ? "OBJECTIVE COMPLETE" : "FLIGHT ENDED"}</span><h1>{won ? "One step further." : "Every flight is a lesson."}</h1><p>{won ? "Nicely done, Commander. The next frontier is a little closer." : "Take what you learned, fine-tune your craft, and give it another go."}</p></div>
      {error && <p className="notice notice-error" role="alert">{error}<button className="text-link" onClick={() => setAttempt((value) => value + 1)}>Refresh report</button></p>}
      {result.medal && <div className={`medal-reveal medal-${result.medal}`}><Icon name="award" size={25} /><span><strong>{result.medal} medal</strong>A little recognition for a stellar effort.</span></div>}
      <section className="panel flight-report"><div className="panel-heading"><Icon name="signal" size={19} /><h2>Your flight, by the numbers</h2></div><div className="report-stats"><div><span>MISSION SCORE</span><strong>{result.score?.toLocaleString() ?? "--"}<small>pts</small></strong></div><div><span>FLIGHT TIME</span><strong>{result.telemetry.elapsed?.toFixed(1) ?? "--"}<small>sec</small></strong></div><div><span>FUEL REMAINING</span><strong>{result.telemetry.fuel_pct == null ? "--" : Math.round(result.telemetry.fuel_pct * 100)}<small>%</small></strong></div><div><span>HULL INTEGRITY</span><strong>{result.telemetry.hull_pct == null ? "--" : Math.round(result.telemetry.hull_pct * 100)}<small>%</small></strong></div></div>{!!result.replay_frames && <div className="flight-recorder"><Icon name="check" size={15} />Flight recorder saved {result.replay_frames} keyframes.</div>}</section>
      <div className="debrief-actions"><Link to={won ? "/missions" : `/missions/${slug}/hangar`} className="btn"><Icon name="rocket" size={18} />{won ? "Find your next frontier" : "Let's try that again"}<Icon name="arrow-right" size={17} /></Link><Link to={won ? "/crafting" : "/missions"} className="btn btn-secondary">{won ? "Explore your upgrades" : "Back to missions"}</Link></div>
    </main>
  );
}
