import { Link } from "react-router-dom";
import Icon, { type IconName } from "../../components/Icon";
import { useGameStore } from "../../store/gameStore";

const steps: { icon: IconName; title: string; description: string }[] = [
  { icon: "orbit", title: "Find your frontier", description: "Start with First Ignition. Open a mission's briefing to see the objective, destination, and difficulty. Finishing missions unlocks new places to explore." },
  { icon: "wrench", title: "Make it your spacecraft", description: "Choose your fuel tank, hull, and any crafted upgrades in the hangar. Watch the mass budget, then launch when your loadout feels right." },
  { icon: "rocket", title: "Take the controls", description: "Thrust to gain altitude, rotate to change direction, and keep an eye on your fuel and hull. The objective meter shows how close you are to success." },
];

export default function FlightGuide() {
  const missions = useGameStore((s) => s.missions);
  const training = missions.find((mission) => mission.slug === "tutorial-first-ignition" && mission.unlocked);
  return (
    <main className="page guide-page">
      <div className="page-heading"><div><div className="eyebrow">A LITTLE GUIDANCE. A LOT OF POSSIBILITY.</div><h1>Your first flight starts here<span className="heading-dot">.</span></h1><p>You don't need to be a rocket scientist. Just take it one step at a time.</p></div><span className="heading-emblem"><Icon name="book" size={32} /></span></div>
      <div className="guide-steps">{steps.map((step, index) => <section className="panel guide-step" key={step.title}><span className="guide-step-number">0{index + 1}</span><span className="guide-step-icon"><Icon name={step.icon} size={30} /></span><h2>{step.title}</h2><p>{step.description}</p></section>)}</div>
      <div className="guide-detail-grid">
        <section className="panel"><div className="panel-heading"><Icon name="play" size={19} /><h2>Meet your flight controls</h2></div><div className="control-row"><span className="key-group"><kbd>W</kbd><span>or</span><kbd aria-label="Up arrow">&#8593;</kbd></span><div><strong>Engage thrust</strong><p>Hold to fire your engines. Release to conserve fuel.</p></div></div><div className="control-row"><span className="key-group"><kbd>A</kbd><kbd aria-label="Left arrow">&#8592;</kbd></span><div><strong>Rotate left</strong><p>Point your spacecraft in a new direction.</p></div></div><div className="control-row"><span className="key-group"><kbd>D</kbd><kbd aria-label="Right arrow">&#8594;</kbd></span><div><strong>Rotate right</strong><p>Small adjustments make a big difference.</p></div></div><p className="touch-tip"><Icon name="info" size={16} />On a phone or tablet? Hold the on-screen flight buttons.</p></section>
        <section className="panel field-notes"><span className="eyebrow">NOTES FROM MISSION CONTROL</span><h2>Fly a little smarter.</h2><div><Icon name="fuel" /><p><strong>Every drop counts.</strong> Short thrust bursts help you keep fuel in reserve. Efficient flights can earn better medals.</p></div><div><Icon name="shield" /><p><strong>Protect your spacecraft.</strong> Collisions damage your hull. If it reaches zero, your flight is over, but you can always try again.</p></div><div><Icon name="award" /><p><strong>Make progress your own.</strong> Earn medals, collect scrap, and visit the crafting bay for upgrades. Create an account to keep your guest progress.</p></div></section>
      </div>
      <section className="guide-cta"><span className="guide-cta-icon"><Icon name="rocket" size={30} /></span><div><h2>Ready when you are, Commander.</h2><p>The best way to learn is to take that first small step.</p></div><Link className="btn" to={training ? `/missions/${training.slug}/briefing` : "/missions"}>Let's take flight<Icon name="arrow-right" size={18} /></Link></section>
    </main>
  );
}
