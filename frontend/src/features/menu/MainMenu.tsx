import { Link } from "react-router-dom";
import StarfieldCanvas from "../../components/StarfieldCanvas";

export default function MainMenu() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <StarfieldCanvas />
      <div>
        <p style={{ color: "var(--muted)", letterSpacing: "0.3em", margin: 0 }}>COMMANDER OS v0.1</p>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", margin: "0.5rem 0" }}>
          SPACE MISSION
          <br />
          SIMULATOR
        </h1>
      </div>
      <p style={{ maxWidth: 480, color: "var(--muted)", fontSize: "1.15rem", lineHeight: 1.5 }}>
        Plan your craft, launch into the void, and complete orbital objectives.
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link to="/missions" className="btn" style={{ textDecoration: "none" }}>
          Start Mission Control
        </Link>
        <Link to="/settings" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Account
        </Link>
      </div>
    </main>
  );
}
