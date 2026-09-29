import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type Phaser from "phaser";
import { api, wsUrl, type RunResult } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";
import { createFlightGame } from "../../game/createGame";
import { prepareFlightAssets } from "../../game/flightAssets";
import type FlightScene from "../../game/FlightScene";
import type { EntitySnapshot, StateSnapshot } from "../../game/FlightScene";
import { missionName, missionPresentation } from "../../shared/missionPresentation";
import Icon from "../../components/Icon";

export { prepareFlightAssets };

type Control = "thrust" | "left" | "right";
const keyboardControls: Record<string, Control> = { KeyW: "thrust", ArrowUp: "thrust", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right" };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isMeter = (value: unknown) => value === undefined || (isRecord(value) && isNumber(value.pct));

function isEntity(value: unknown): value is EntitySnapshot {
  return isRecord(value) && typeof value.id === "string" && typeof value.kind === "string" &&
    ["x", "y", "angle", "cx", "cy", "radius", "width", "height", "peri_km", "apo_km"].every((key) => value[key] === undefined || isNumber(value[key])) &&
    (value.components === undefined || (isRecord(value.components) && isMeter(value.components.fuel) && isMeter(value.components.hull)));
}

function isSnapshot(value: unknown): value is StateSnapshot {
  return isRecord(value) && value.type === "state" && isNumber(value.tick) && typeof value.status === "string" &&
    Array.isArray(value.entities) && value.entities.every(isEntity) &&
    Array.isArray(value.events) && value.events.every((event: unknown) => isRecord(event) && typeof event.name === "string") &&
    isRecord(value.objective) && typeof value.objective.label === "string" && isNumber(value.objective.progress) &&
    (value.altitude_km === undefined || isNumber(value.altitude_km));
}

function isTelemetry(value: unknown): value is RunResult["telemetry"] {
  return isRecord(value) && ["elapsed", "fuel_pct", "hull_pct"].every((key) => value[key] === undefined || isNumber(value[key]));
}

export default function FlightView({ onContentReady }: { onContentReady: (element: HTMLElement | null) => void }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const runId = useGameStore((s) => s.runId);
  const mission = useGameStore((s) => s.currentMission);
  const setHud = useGameStore((s) => s.setHud);
  const setLastResult = useGameStore((s) => s.setLastResult);
  const hud = useGameStore((s) => s.hud);
  const containerRef = useRef<HTMLDivElement>(null);
  const exitDialog = useRef<HTMLDialogElement>(null);
  const inputRef = useRef({ thrust: false, rotate: 0 });
  const controlsRef = useRef(new Map<string, Control>());
  const seqRef = useRef(0);
  const [connection, setConnection] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [error, setError] = useState("");
  const [enginesEngaged, setEnginesEngaged] = useState(false);
  const [hasIgnited, setHasIgnited] = useState(false);
  const presentation = missionPresentation(slug ?? "");
  const getInput = useCallback(() => inputRef.current, []);

  const resetInput = useCallback(() => {
    controlsRef.current.clear();
    inputRef.current = { thrust: false, rotate: 0 };
    setEnginesEngaged(false);
  }, []);

  const updateControl = useCallback((source: string, control: Control | null) => {
    if (control) controlsRef.current.set(source, control);
    else controlsRef.current.delete(source);
    const controls = new Set(controlsRef.current.values());
    inputRef.current = { thrust: controls.has("thrust"), rotate: Number(controls.has("right")) - Number(controls.has("left")) };
    setEnginesEngaged(controls.has("thrust"));
    if (controls.has("thrust")) setHasIgnited(true);
  }, []);

  useEffect(() => {
    if (!runId) {
      navigate(`/missions/${slug}/hangar`, { replace: true });
      return;
    }
    let active = true;
    let closing = false;
    let game: Phaser.Game | undefined;
    let scene: FlightScene | undefined;
    let ws: WebSocket | undefined;
    let inputInterval: ReturnType<typeof setInterval> | undefined;
    let connectionTimeout: ReturnType<typeof setTimeout> | undefined;
    setConnection("connecting");
    setError("");
    seqRef.current = 0;

    const stopSendingInput = () => {
      if (inputInterval) clearInterval(inputInterval);
      inputInterval = undefined;
    };
    const destroyGame = () => {
      game?.destroy(true);
      game = undefined;
    };
    const connectSocket = () => {
      if (ws) return;
      const socket = new WebSocket(wsUrl(`/ws/mission/${runId}`));
      ws = socket;
      connectionTimeout = setTimeout(() => {
        socket.close();
        if (!active) return;
        resetInput();
        setConnection("disconnected");
        setError((previous) => previous
          ? `${previous} Mission control couldn't confirm cancellation. Check your connection before launching again.`
          : "The flight link timed out. Check your connection and return to the hangar.");
      }, 10_000);
      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        if (!active || closing) {
          socket.send(JSON.stringify({ type: "abort" }));
          socket.close();
          return;
        }
        setConnection("connected");
        inputInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "input", seq: ++seqRef.current, ...inputRef.current }));
        }, 50);
      };
      socket.onclose = () => {
        clearTimeout(connectionTimeout);
        stopSendingInput();
        if (!active || closing) return;
        resetInput();
        setConnection("disconnected");
        setError((previous) => previous || "Your flight link was interrupted. Return to the hangar to prepare a new mission.");
      };
      socket.onerror = () => {
        if (!active || closing) return;
        resetInput();
        setConnection("disconnected");
        setError("Unable to establish a flight link. Check your connection and return to the hangar.");
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        if (!active || closing || !scene) return;
        let data: unknown;
        try {
          data = JSON.parse(event.data);
        } catch (reason) {
          if (!(reason instanceof SyntaxError)) throw reason;
          setError("Mission control sent an unreadable update. Return to the hangar to reconnect.");
          resetInput();
          socket.close();
          return;
        }
        if (isSnapshot(data)) {
          scene.applyState(data);
        } else if (isRecord(data) && (data.type === "mission_won" || data.type === "mission_lost") &&
          (data.score === null || isNumber(data.score)) && (data.medal === null || typeof data.medal === "string") && isTelemetry(data.telemetry)) {
          resetInput();
          setLastResult({ run_id: runId, status: data.type === "mission_won" ? "won" : "lost", score: data.score, medal: data.medal, telemetry: data.telemetry });
          navigate(`/missions/${slug}/debrief`);
        } else {
          setError("Your flight link sent an invalid update. Return to the hangar to reconnect.");
          resetInput();
          socket.close();
        }
      };
    };
    const closeLink = () => {
      closing = true;
      stopSendingInput();
      if (!ws) {
        void api.cancelUnstartedRun(runId).catch((reason: unknown) => {
          const message = reason instanceof Error ? reason.message : "The abandoned launch couldn't be cancelled.";
          if (active) setError((previous) => `${previous} ${message}`.trim());
          else console.error("The abandoned launch couldn't be cancelled.", reason);
        });
      }
      else if (ws.readyState === WebSocket.OPEN) ws.close();
    };
    const failRenderer = (message: string) => {
      if (!active || closing) return;
      resetInput();
      setError(message);
      setConnection("disconnected");
      closeLink();
      destroyGame();
    };

    // Artwork and the scene must be ready before the server starts sending flight state.
    void prepareFlightAssets().then((assets) => {
      if (!active || !containerRef.current) return;
      game = createFlightGame(containerRef.current, {
        assets,
        environment: missionPresentation(slug ?? "").scene,
        objective: mission?.objective ?? {},
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        getInput,
        onHud: setHud,
        onReady: (readyScene) => {
          if (!active || closing) return;
          scene = readyScene;
          connectSocket();
        },
        onError: failRenderer,
      });
      if (closing) destroyGame();
    }).catch((reason: unknown) => {
      failRenderer(reason instanceof Error ? reason.message : "The flight renderer couldn't start. Return to the hangar and try again.");
    });

    return () => {
      active = false;
      resetInput();
      if (ws || game) closeLink();
      destroyGame();
    };
  }, [runId, slug, mission, navigate, setHud, setLastResult, getInput, resetInput]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const control = keyboardControls[event.code];
      if (!control || exitDialog.current?.open || connection !== "connected" || error) return;
      event.preventDefault();
      updateControl(event.code, control);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!keyboardControls[event.code]) return;
      event.preventDefault();
      updateControl(event.code, null);
    };
    const onVisibility = () => { if (document.hidden) resetInput(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", resetInput);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", resetInput);
      document.removeEventListener("visibilitychange", onVisibility);
      resetInput();
    };
  }, [resetInput, updateControl, connection, error]);

  const releasePointer = (event: ReactPointerEvent<HTMLButtonElement>) => updateControl(`pointer-${event.pointerId}`, null);
  const handlers = (control: Control) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      updateControl(`pointer-${event.pointerId}`, control);
    },
    onPointerUp: releasePointer,
    onPointerCancel: releasePointer,
    onLostPointerCapture: releasePointer,
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      updateControl(`button-${control}`, control);
    },
    onKeyUp: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      updateControl(`button-${control}`, null);
    },
    onBlur: () => updateControl(`button-${control}`, null),
  });

  const percentage = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100);
  const returnToHangar = () => navigate(`/missions/${slug}/hangar`);
  const propulsionActive = enginesEngaged && hud.fuel > 0 && hud.hull > 0 && connection === "connected" && !error;

  return (
    <main ref={onContentReady} className="flight-screen" aria-label="Mission flight deck" tabIndex={-1}>
      <header className="flight-header"><div className="flight-brand"><Icon name="orbit" size={30} /><span>ORBITAL<small>LIVE FLIGHT OPERATIONS</small></span></div><span className={`connection-status ${connection === "connected" ? "is-online" : connection === "disconnected" ? "is-offline" : ""}`} role="status"><span className="status-dot" />{connection === "connected" ? "FLIGHT LINK ACTIVE" : connection === "disconnected" ? "LINK INTERRUPTED" : "ESTABLISHING LINK"}</span><button className="flight-exit" onClick={() => { resetInput(); exitDialog.current?.showModal(); }}><Icon name="arrow-left" size={15} />Hangar</button></header>
      <section className="flight-telemetry" aria-label="Live flight telemetry">
        <div className="telemetry-item"><div><Icon name="fuel" size={14} /><span>FUEL</span><strong>{percentage(hud.fuel)}%</strong></div><div className={`meter ${hud.fuel < .2 ? "is-danger" : ""}`} role="meter" aria-label="Fuel remaining" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage(hud.fuel)}><span style={{ width: `${percentage(hud.fuel)}%` }} /></div></div>
        <div className="telemetry-item"><div><Icon name="shield" size={14} /><span>HULL</span><strong>{percentage(hud.hull)}%</strong></div><div className={`meter ${hud.hull < .3 ? "is-danger" : ""}`} role="meter" aria-label="Hull integrity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage(hud.hull)}><span style={{ width: `${percentage(hud.hull)}%`, background: hud.hull < .3 ? undefined : "var(--success)" }} /></div></div>
        <div className="altitude-readout"><span>ALTITUDE</span><strong>{hud.altitude.toFixed(0)}</strong><small>km</small></div>
        <div className="flight-objective"><Icon name="target" size={21} /><div><small>YOUR OBJECTIVE</small><p>{hud.objective || "Receiving your flight plan..."}</p></div><strong>{percentage(hud.progress)}%</strong></div>
      </section>
      <div className={`flight-viewport flight-environment-${presentation.scene}`}>
        <div ref={containerRef} className="flight-canvas" aria-label="Live spacecraft simulation" />
        <div className="flight-scene-heading"><span className="eyebrow"><span className="status-dot" />{presentation.category.toUpperCase()} / LIVE FLIGHT</span><h1>{mission ? missionName(mission.name) : "Your next frontier"}<span>.</span></h1><p>{presentation.destination} <span>/</span> Explorer spacecraft</p></div>
        <div className={`flight-engine-state ${propulsionActive ? "is-firing" : ""}`}>
          <span className="engine-state-icon"><Icon name={propulsionActive ? "zap" : "rocket"} size={22} /></span>
          <div><span className="eyebrow">{hud.fuel <= 0 ? "FUEL DEPLETED" : propulsionActive ? "PROPULSION ACTIVE" : "MANUAL FLIGHT CONTROL"}</span><strong>{hud.fuel <= 0 ? "Make your momentum count." : propulsionActive ? "You're going places." : hasIgnited ? "Coasting. The next move is yours." : "Ready for your first ignition."}</strong><p>{propulsionActive ? "Release thrust to conserve fuel." : hud.fuel <= 0 ? "Steer with A / D or the rotation controls." : "Hold W / \u2191 or the Thrust button to fire your engines."}</p></div>
        </div>
        <div className="flight-sector-label" aria-hidden="true"><span className="status-dot" />SOL SYSTEM <span>/</span> {presentation.scene === "lunar" ? "LUNAR OPERATIONS" : "EXPLORATION SECTOR 01"}</div>
      </div>
      {error && <section className="flight-message" role="alert"><Icon name="signal" size={30} /><h2>Let's get you reconnected.</h2><p>{error}</p><button className="btn" onClick={returnToHangar}>Return to hangar<Icon name="arrow-right" size={17} /></button></section>}
      <footer className="flight-controls">
        <button className="btn btn-secondary" disabled={connection !== "connected" || !!error} aria-label="Rotate left, hold A or left arrow" {...handlers("left")}><Icon name="arrow-left" size={18} />Rotate left<kbd>A</kbd></button>
        <button className="btn" disabled={connection !== "connected" || !!error} aria-label="Thrust, hold W or up arrow" {...handlers("thrust")}><Icon name="rocket" size={18} />Thrust<kbd>W</kbd></button>
        <button className="btn btn-secondary" disabled={connection !== "connected" || !!error} aria-label="Rotate right, hold D or right arrow" {...handlers("right")}>Rotate right<Icon name="arrow-right" size={18} /><kbd>D</kbd></button>
        <p><Icon name="info" size={15} />Hold to engage. Release to coast.</p>
      </footer>
      <dialog ref={exitDialog} className="flight-exit-dialog" aria-labelledby="exit-title" onClose={resetInput}>
        <Icon name="orbit" size={36} /><h2 id="exit-title">Return to the hangar?</h2><p>This flight can't be resumed after you leave. The simulation continues while this dialog is open.</p><form method="dialog"><button className="btn btn-secondary">Stay in flight</button><button className="btn" type="button" onClick={returnToHangar}>Return to hangar</button></form>
      </dialog>
    </main>
  );
}
