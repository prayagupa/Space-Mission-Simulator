import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";

export default function Settings() {
  const player = useGameStore((s) => s.player);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.me().then(setPlayer).catch(() => api.ensureGuest().then(() => api.me().then(setPlayer)));
  }, [setPlayer]);

  const submit = async () => {
    setError("");
    try {
      const p =
        mode === "register"
          ? await api.register(email, password, displayName || undefined)
          : await api.login(email, password);
      setPlayer(p);
      setMsg(mode === "register" ? "Account created!" : "Logged in!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const logout = async () => {
    await api.logout();
    await api.ensureGuest();
    const p = await api.me();
    setPlayer(p);
    setMsg("Logged out — playing as guest");
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "2rem" }}>
      <Link to="/missions" style={{ color: "var(--muted)", textDecoration: "none" }}>
        ← Galaxy Map
      </Link>
      <h1 style={{ marginTop: "1rem" }}>Account</h1>
      <div className="panel">
        <p>
          <strong>Status:</strong>{" "}
          {player?.is_guest ? "Guest" : `Registered — ${player?.display_name || player?.email}`}
        </p>
        {msg && <p style={{ color: "var(--success)" }}>{msg}</p>}
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {!player?.is_guest ? (
          <button className="btn btn-secondary" onClick={logout}>
            Log out
          </button>
        ) : (
          <>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button className={mode === "register" ? "btn" : "btn btn-secondary"} onClick={() => setMode("register")}>
                Register
              </button>
              <button className={mode === "login" ? "btn" : "btn btn-secondary"} onClick={() => setMode("login")}>
                Login
              </button>
            </div>
            {mode === "register" && (
              <input
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={inputStyle}
              />
            )}
            <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <input
              placeholder="Password (min 6)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button className="btn" onClick={submit} style={{ marginTop: "0.5rem" }}>
              {mode === "register" ? "Create account" : "Log in"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

const inputStyle: Record<string, string | number> = {
  display: "block",
  width: "100%",
  marginBottom: "0.5rem",
  padding: "0.5rem",
  background: "#0a0e1a",
  border: "1px solid rgba(0,212,255,0.3)",
  borderRadius: 6,
  color: "#e8f0ff",
};
