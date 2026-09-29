import Icon from "./Icon";

export default function MissionSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="mission-steps" aria-label="Mission preparation">
      {["Mission briefing", "Configure craft", "Launch"].map((label, index) => (
        <li key={label} className={index === current ? "is-current" : index < current ? "is-complete" : ""} aria-current={index === current ? "step" : undefined}>
          <span className="step-number">{index < current ? <Icon name="check" size={14} /> : `0${index + 1}`}</span>
          <span>{label}</span>
          {index < 2 && <Icon name="chevron" size={14} />}
        </li>
      ))}
    </ol>
  );
}
