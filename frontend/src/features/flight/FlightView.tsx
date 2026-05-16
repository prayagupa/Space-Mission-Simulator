import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Phaser from "phaser";
import { api, wsUrl } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";
import { createFlightGame, getFlightScene } from "../../game/createGame";
import type { StateSnapshot } from "../../game/FlightScene";

export default function FlightView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const runId = useGameStore((s) => s.runId);
  const setHud = useGameStore((s) => s.setHud);
  const setLastResult = useGameStore((s) => s.setLastResult);
  const hud = useGameStore((s) => s.hud);

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef({ thrust: false, rotate: 0 });
  const seqRef = useRef(0);

  const [connected, setConnected] = useState(false);

  const getInput = useCallback(() => inputRef.current, []);

  useEffect(() => {
    if (!runId) {
      navigate(`/missions/${slug}/hangar`);
      return;
    }
    if (!containerRef.current) return;

    const game = createFlightGame(containerRef.current, {
      getInput,
      onHud: (h) => setHud(h),
      onEnd: async (msg) => {
        const result = await api.getRunResult(runId);
        setLastResult({
          run_id: runId,
          status: result.status || msg.status || "lost",
          score: msg.score ?? result.score,
          medal: msg.medal ?? result.medal,
          telemetry: result.telemetry,
        });
        navigate(`/missions/${slug}/debrief`);
      },
    });
    gameRef.current = game;

    const ws = new WebSocket(wsUrl(`/ws/mission/${runId}`));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === "state") {
        const scene = getFlightScene(game);
        scene?.applyState(data as StateSnapshot);
      } else if (data.type === "mission_won" || data.type === "mission_lost") {
        setLastResult({
          run_id: runId,
          status: data.status,
          score: data.score,
          medal: data.medal,
          telemetry: data.telemetry ?? {},
        });
        navigate(`/missions/${slug}/debrief`);
      }
    };

    const inputInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "input",
            seq: ++seqRef.current,
            thrust: inputRef.current.thrust,
            rotate: inputRef.current.rotate,
          })
        );
      }
    }, 50);

    return () => {
      clearInterval(inputInterval);
      ws.close();
      game.destroy(true);
      gameRef.current = null;
    };
  }, [runId, slug, navigate, setHud, setLastResult, getInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") inputRef.current.thrust = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") inputRef.current.rotate = -1;
      if (e.code === "KeyD" || e.code === "ArrowRight") inputRef.current.rotate = 1;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") inputRef.current.thrust = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft" || e.code === "KeyD" || e.code === "ArrowRight")
        inputRef.current.rotate = 0;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const bar = (pct: number, color: string) => (
    <div
      style={{
        height: 8,
        flex: 1,
        background: "rgba(255,255,255,0.1)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div style={{ width: `${pct * 100}%`, height: "100%", background: color, transition: "width 0.1s" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "center",
          padding: "0.75rem 1.25rem",
          background: "rgba(10,14,26,0.95)",
          borderBottom: "1px solid rgba(0,212,255,0.2)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: connected ? "var(--success)" : "var(--danger)", fontSize: "0.85rem" }}>
          {connected ? "LINKED" : "CONNECTING…"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 120 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>FUEL</span>
          {bar(hud.fuel, hud.fuel < 0.2 ? "var(--accent-warm)" : "var(--accent)")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 120 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>HULL</span>
          {bar(hud.hull, hud.hull < 0.3 ? "var(--danger)" : "var(--success)")}
        </div>
        <span>ALT {hud.altitude.toFixed(0)} km</span>
        <span style={{ flex: 1, color: "var(--muted)", fontSize: "0.9rem" }}>
          {hud.objective} ({Math.round(hud.progress * 100)}%)
        </span>
      </header>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      <footer
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          padding: "0.75rem",
          background: "rgba(10,14,26,0.95)",
        }}
      >
        <button
          className="btn btn-secondary"
          onTouchStart={() => { inputRef.current.rotate = -1; }}
          onTouchEnd={() => { inputRef.current.rotate = 0; }}
          onMouseDown={() => { inputRef.current.rotate = -1; }}
          onMouseUp={() => { inputRef.current.rotate = 0; }}
          onMouseLeave={() => { inputRef.current.rotate = 0; }}
        >
          ↺ Rotate L
        </button>
        <button
          className="btn"
          onTouchStart={() => { inputRef.current.thrust = true; }}
          onTouchEnd={() => { inputRef.current.thrust = false; }}
          onMouseDown={() => { inputRef.current.thrust = true; }}
          onMouseUp={() => { inputRef.current.thrust = false; }}
          onMouseLeave={() => { inputRef.current.thrust = false; }}
        >
          ▲ Thrust
        </button>
        <button
          className="btn btn-secondary"
          onTouchStart={() => { inputRef.current.rotate = 1; }}
          onTouchEnd={() => { inputRef.current.rotate = 0; }}
          onMouseDown={() => { inputRef.current.rotate = 1; }}
          onMouseUp={() => { inputRef.current.rotate = 0; }}
          onMouseLeave={() => { inputRef.current.rotate = 0; }}
        >
          Rotate R ↻
        </button>
        <p style={{ margin: 0, alignSelf: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
          W / ↑ thrust · A/D rotate
        </p>
      </footer>
    </div>
  );
}
