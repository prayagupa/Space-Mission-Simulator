import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";
import Icon from "../../components/Icon";
import DataState from "../../components/DataState";

export default function Settings() {
  const player = useGameStore((s) => s.player);
  const missions = useGameStore((s) => s.missions);
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const initialize = useGameStore((s) => s.initialize);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (mode === "register") await api.register(email, password, displayName.trim() || undefined);
      else await api.login(email, password);
      if (await initialize()) {
        setMessage(mode === "register" ? "Welcome aboard! Your account is ready and your progress is saved." : "Welcome back. Your flight deck is ready.");
        setPassword("");
      } else {
        setError("Your account is connected, but your flight deck couldn't refresh. Use Reconnect above to try again.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to connect your account. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const logout = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await api.logout();
      if (await initialize()) setMessage("Signed out. You're now exploring as a guest.");
      else setError("Signed out, but a new guest session couldn't connect. Use Reconnect above to try again.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign out. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="page account-page">
      <div className="page-heading"><div><div className="eyebrow">A PLACE FOR YOUR EXPLORER STORY</div><h1>Welcome, Commander<span className="heading-dot">.</span></h1><p>Your missions. Your milestones. Your little corner of the universe.</p></div></div>
      {message && <p className="notice notice-success" role="status"><Icon name="check" size={18} />{message}</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {!player ? <DataState error={sessionStatus === "error" ? "Reconnect to mission control to access your account." : undefined} message="Opening your commander profile..." /> : (
        <div className="account-grid">
          <section className="panel profile-summary"><div className="profile-orbits" aria-hidden="true"><i /><i /></div><div className="commander-avatar"><Icon name="user" size={42} /></div><span className={`pill ${player.is_guest ? "" : "pill-success"}`}>{player.is_guest ? "GUEST EXPLORER" : "REGISTERED EXPLORER"}</span><h2>{player.display_name || "Your adventure awaits."}</h2><p>{player.is_guest ? "No account needed to take your first small step. Create one whenever you're ready to keep your progress." : player.email}</p><div className="profile-stats"><span><strong>{missions.filter((mission) => mission.best_medal).length}</strong>MISSIONS COMPLETED</span><span><strong>{missions.filter((mission) => mission.unlocked).length}</strong>FRONTIERS UNLOCKED</span></div><Link to="/missions" className="text-link">Back to exploring<Icon name="arrow-right" size={16} /></Link></section>
          <section className="panel account-form-panel">
            {player.is_guest ? (
              <>
                <span className="eyebrow">DON'T LOSE YOUR PLACE AMONG THE STARS</span><h2>{mode === "register" ? "Make your journey yours." : "Good to have you back."}</h2><p className="panel-description">{mode === "register" ? "Create an account to keep your guest progress and continue on another device." : "Sign in to continue where your last adventure left off."}</p>
                <div className="account-tabs" role="group" aria-label="Account action"><button aria-pressed={mode === "register"} disabled={pending} onClick={() => { setMode("register"); setError(""); setMessage(""); }}>Create account</button><button aria-pressed={mode === "login"} disabled={pending} onClick={() => { setMode("login"); setError(""); setMessage(""); }}>Sign in</button></div>
                <form onSubmit={(event) => void submit(event)} aria-label={mode === "register" ? "Create account" : "Sign in"}><fieldset disabled={pending}>
                  {mode === "register" && <label className="form-field">Commander name <span>(optional)</span><input autoComplete="nickname" placeholder="What should we call you?" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
                  <label className="form-field">Email address<input required autoComplete="email" type="email" placeholder="commander@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                  <label className="form-field">Password<input required minLength={mode === "register" ? 6 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} type="password" placeholder={mode === "register" ? "At least 6 characters" : "Your password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                  <button className="btn full-width" type="submit">{pending ? "Connecting your account..." : mode === "register" ? "Begin your explorer story" : "Return to mission control"}<Icon name="arrow-right" size={18} /></button>
                </fieldset></form><p className="account-assurance"><Icon name="shield" size={15} />Your guest progress comes with you when you register.</p>
              </>
            ) : (
              <div className="registered-account"><span className="account-connected"><Icon name="shield" size={34} /></span><span className="eyebrow">YOUR EXPLORER PROFILE IS CONNECTED</span><h2>A universe of possibility.<br />A place to call yours.</h2><p>Your mission progress is connected to this account. Sign in on another device to pick up where you left off.</p><Link className="btn" to="/missions">Find your next mission<Icon name="arrow-right" size={18} /></Link><button className="text-link logout-button" disabled={pending} onClick={() => void logout()}><Icon name="log-out" size={16} />{pending ? "Signing out..." : "Sign out of your account"}</button></div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
