import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CraftRecipe } from "../../shared/api";
import { useGameStore } from "../../store/gameStore";
import Icon, { type IconName } from "../../components/Icon";
import DataState from "../../components/DataState";

const recipeDetails: Record<string, { icon: IconName; label: string; description: string }> = {
  extended_tank: { icon: "fuel", label: "ENDURANCE", description: "A bigger reserve for a bigger adventure. Give yourself more room to explore." },
  turbo_thruster: { icon: "zap", label: "PROPULSION", description: "Bring a little more power to your next frontier. Every burn can take you further." },
  reinforced_hull: { icon: "shield", label: "PROTECTION", description: "For the bumps along the way. A little resilience can make all the difference." },
};

export default function Crafting() {
  const sessionStatus = useGameStore((s) => s.sessionStatus);
  const initialize = useGameStore((s) => s.initialize);
  const [scrap, setScrap] = useState(0);
  const [recipes, setRecipes] = useState<CraftRecipe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (sessionStatus !== "ready") return;
    let active = true;
    setError("");
    setLoaded(false);
    api.craftingRecipes().then((result) => {
      if (!active) return;
      setScrap(result.scrap);
      setRecipes(result.recipes);
      setLoaded(true);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load the crafting bay.");
    });
    return () => { active = false; };
  }, [sessionStatus, attempt]);

  const craft = async (recipe: CraftRecipe) => {
    if (pending || !recipe.can_craft) return;
    setPending(recipe.id);
    setError("");
    setMessage("");
    try {
      await api.craft(recipe.id);
      setMessage(`${recipe.name} crafted. Your new module is waiting in the hangar.`);
      const result = await api.craftingRecipes();
      setScrap(result.scrap);
      setRecipes(result.recipes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Crafting could not be completed. Please try again.");
    } finally {
      setPending(null);
    }
  };

  return (
    <main className="page">
      <div className="page-heading"><div><div className="eyebrow">A LITTLE INGENUITY GOES A LONG WAY</div><h1>The crafting bay<span className="heading-dot">.</span></h1><p>Turn your achievements into an edge for your next adventure.</p></div><div className="scrap-balance"><span className="scrap-icon"><Icon name="layers" size={24} /></span><span><small>YOUR SCRAP BALANCE</small><strong>{loaded ? scrap : "--"}<em>scrap</em></strong></span></div></div>
      <div className="crafting-intro"><Icon name="award" size={22} /><p><strong>Great flights open new possibilities.</strong> Earn medals to collect scrap and unlock blueprints. Crafted modules are available in your hangar.</p><Link to="/missions" className="text-link">Earn your next medal<Icon name="arrow-up-right" size={16} /></Link></div>
      {message && <p className="notice notice-success" role="status"><Icon name="check" size={18} />{message}</p>}
      {loaded && error && <p className="notice notice-error" role="alert">{error}<button className="text-link" onClick={() => setAttempt((value) => value + 1)}>Refresh blueprints</button></p>}
      {!loaded ? <DataState error={sessionStatus === "error" ? "Reconnect to mission control to load your blueprints." : error} message="Opening the component workshop..." onRetry={() => { if (sessionStatus === "error") void initialize(); else setAttempt((value) => value + 1); }} /> : <div className="crafting-grid">{recipes.map((recipe) => {
        const details = recipeDetails[recipe.id];
        return <section className={`recipe-card ${recipe.crafted ? "is-crafted" : ""}`} key={recipe.id}><div className={`recipe-art recipe-${recipe.id}`}><div className="recipe-orbit" /><Icon name={details?.icon ?? "layers"} size={70} /><span className="eyebrow">{details?.label ?? "UPGRADE"}</span><span className="recipe-status">{recipe.crafted ? <><Icon name="check" size={14} />Owned</> : recipe.can_craft ? <><span className="status-dot" />Available</> : <><Icon name="lock" size={13} />Blueprint locked</>}</span></div><div className="recipe-content"><h2>{recipe.name}</h2><p>{details?.description ?? "A new possibility for your spacecraft."}</p><div className="recipe-cost"><span><Icon name="layers" size={16} />Crafting cost</span><strong>{recipe.cost_scrap}<small> scrap</small></strong></div><p className="recipe-requirement">{recipe.crafted ? "Ready to fit in your next mission's hangar." : recipe.can_craft ? "Everything you need. Ready when you are." : recipe.reason?.replaceAll("-", " ") || "Complete more missions to unlock this blueprint."}</p><button className={`btn full-width ${recipe.crafted ? "btn-secondary" : ""}`} disabled={!!pending || !recipe.can_craft || recipe.crafted} onClick={() => void craft(recipe)}><Icon name={recipe.crafted ? "check" : recipe.can_craft ? "wrench" : "lock"} size={17} />{pending === recipe.id ? "Crafting your module..." : recipe.crafted ? "In your collection" : recipe.can_craft ? "Craft module" : "Not yet available"}</button></div></section>;
      })}</div>}
      <div className="workshop-note"><Icon name="sparkles" size={18} /><p>The best upgrade? Experience. Every mission teaches you something new.</p><Link className="text-link" to="/guide">Explore the flight guide<Icon name="arrow-right" size={15} /></Link></div>
    </main>
  );
}
