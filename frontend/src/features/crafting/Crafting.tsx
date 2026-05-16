import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CraftRecipe } from "../../shared/api";

export default function Crafting() {
  const [scrap, setScrap] = useState(0);
  const [recipes, setRecipes] = useState<CraftRecipe[]>([]);
  const [msg, setMsg] = useState("");

  const load = () => api.craftingRecipes().then((r) => {
    setScrap(r.scrap);
    setRecipes(r.recipes);
  });

  useEffect(() => {
    load();
  }, []);

  const craft = async (id: string) => {
    try {
      await api.craft(id);
      setMsg(`Crafted ${id}!`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Craft failed");
    }
  };

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2rem" }}>
      <Link to="/missions" style={{ color: "var(--muted)", textDecoration: "none" }}>
        ← Galaxy Map
      </Link>
      <h1 style={{ marginTop: "1rem" }}>Crafting Bay</h1>
      <p style={{ color: "var(--muted)" }}>Earn scrap from medals. Craft modules for your hangar.</p>
      <div className="panel">
        <p>
          <strong>Scrap:</strong> {scrap}
        </p>
        {msg && <p style={{ color: "var(--accent)" }}>{msg}</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {recipes.map((r) => (
            <li key={r.id} style={{ marginBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
              <strong>{r.name}</strong> — {r.cost_scrap} scrap
              {r.crafted && <span style={{ color: "var(--success)", marginLeft: 8 }}>✓ Owned</span>}
              {!r.crafted && !r.can_craft && r.reason && (
                <p style={{ margin: "0.25rem 0", fontSize: "0.85rem", color: "var(--accent-warm)" }}>{r.reason}</p>
              )}
              {!r.crafted && (
                <button className="btn" style={{ marginTop: "0.35rem" }} disabled={!r.can_craft} onClick={() => craft(r.id)}>
                  Craft
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
