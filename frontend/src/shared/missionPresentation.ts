export type MissionScene = "launch" | "orbit" | "debris" | "asteroid" | "lunar";

type MissionPresentation = {
  category: string;
  description: string;
  destination: string;
  scene: MissionScene;
};

const presentations: Record<string, MissionPresentation> = {
  "tutorial-first-ignition": {
    category: "Flight training",
    description: "Every great explorer starts somewhere. Find your wings above Earth.",
    destination: "Earth atmosphere",
    scene: "launch",
  },
  "low-earth-insertion": {
    category: "Orbital flight",
    description: "Find your balance. Turn a moment of flight into a stable orbit.",
    destination: "Low Earth orbit",
    scene: "orbit",
  },
  "debris-field": {
    category: "Deep-space navigation",
    description: "Thread the debris. Keep your cool. Bring your spacecraft home.",
    destination: "Orbital debris field",
    scene: "debris",
  },
  "asteroid-survey": {
    category: "Exploration",
    description: "Hold your survey orbit and uncover a world beyond the familiar.",
    destination: "Asteroid cluster",
    scene: "asteroid",
  },
  "moon-landing": {
    category: "Lunar expedition",
    description: "A gentle touch. A giant achievement. Make your mark on the Moon.",
    destination: "Lunar surface",
    scene: "lunar",
  },
};

export function missionPresentation(slug: string): MissionPresentation {
  return presentations[slug] ?? {
    category: "Space exploration",
    description: "Prepare your spacecraft and take on a new frontier.",
    destination: "Mission sector",
    scene: "orbit",
  };
}

export function missionName(name: string): string {
  return name.replace(/^Tutorial:\s*/, "");
}

export function difficultyLabel(difficulty: number): string {
  if (difficulty <= 1) return "Beginner";
  if (difficulty === 2) return "Intermediate";
  if (difficulty === 3) return "Advanced";
  return "Expert";
}
