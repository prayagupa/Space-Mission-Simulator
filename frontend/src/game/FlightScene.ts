import Phaser from "phaser";

export type EntitySnapshot = {
  id: string;
  kind: string;
  x?: number;
  y?: number;
  angle?: number;
  cx?: number;
  cy?: number;
  radius?: number;
  width?: number;
  height?: number;
  components?: { fuel?: { pct: number }; hull?: { pct: number } };
};

export type StateSnapshot = {
  type: string;
  tick: number;
  status: string;
  entities: EntitySnapshot[];
  events: { name: string }[];
  objective: { label: string; progress: number };
  altitude_km?: number;
};

type SceneCallbacks = {
  onHud: (data: { fuel: number; hull: number; altitude: number; objective: string; progress: number }) => void;
  onEnd: (msg: { type: string; score?: number; medal?: string; status?: string }) => void;
  getInput: () => { thrust: boolean; rotate: number };
};

export default class FlightScene extends Phaser.Scene {
  private shipGfx?: Phaser.GameObjects.Graphics;
  private thrustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private entityGfx = new Map<string, Phaser.GameObjects.GameObject>();
  private callbacks!: SceneCallbacks;

  constructor() {
    super("FlightScene");
  }

  init() {
    this.callbacks = this.game.registry.get("flightCallbacks") as SceneCallbacks;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0e1a");
    this.createStarfield();

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("particle", 8, 8);
    g.destroy();

    this.shipGfx = this.add.graphics();
    this.thrustEmitter = this.add.particles(0, 0, "particle", {
      speed: { min: 40, max: 120 },
      scale: { start: 0.6, end: 0 },
      lifespan: 400,
      blendMode: "ADD",
      frequency: -1,
    });
  }

  createStarfield() {
    const layers = [
      { count: 80, speed: 0.15, color: 0x334466, size: 1 },
      { count: 60, speed: 0.35, color: 0x667799, size: 1.5 },
      { count: 40, speed: 0.6, color: 0xaabbdd, size: 2 },
    ];
    for (const layer of layers) {
      const g = this.add.graphics();
      g.fillStyle(layer.color, 0.9);
      for (let i = 0; i < layer.count; i++) {
        g.fillCircle(Phaser.Math.Between(0, 2000), Phaser.Math.Between(0, 1200), layer.size);
      }
      g.setScrollFactor(layer.speed);
    }
  }

  applyState(state: StateSnapshot) {
    if (!this.shipGfx) return;

    const ship = state.entities.find((e) => e.kind === "ship");
    if (ship && ship.x != null && ship.y != null) {
      const sx = ship.x + 24;
      const sy = ship.y + 24;
      this.cameras.main.centerOn(sx, sy);

      this.shipGfx.clear();
      this.shipGfx.fillStyle(0x00d4ff, 1);
      this.shipGfx.lineStyle(2, 0xffffff, 0.9);
      const angle = ship.angle ?? -Math.PI / 2;
      const len = 28;
      const tipX = sx + Math.cos(angle) * len;
      const tipY = sy + Math.sin(angle) * len;
      const leftX = sx + Math.cos(angle + 2.4) * 16;
      const leftY = sy + Math.sin(angle + 2.4) * 16;
      const rightX = sx + Math.cos(angle - 2.4) * 16;
      const rightY = sy + Math.sin(angle - 2.4) * 16;
      this.shipGfx.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
      this.shipGfx.strokeTriangle(tipX, tipY, leftX, leftY, rightX, rightY);

      const input = this.callbacks.getInput();
      if (input.thrust) {
        this.thrustEmitter?.setPosition(sx - Math.cos(angle) * 20, sy - Math.sin(angle) * 20);
        this.thrustEmitter?.explode(3);
      }
    }

    const kinds = new Set(state.entities.map((e) => e.id));
    for (const id of [...this.entityGfx.keys()]) {
      if (!kinds.has(id)) {
        this.entityGfx.get(id)?.destroy();
        this.entityGfx.delete(id);
      }
    }

    for (const ent of state.entities) {
      if (ent.kind === "ship") continue;
      let obj = this.entityGfx.get(ent.id);
      if (ent.kind === "planet" && ent.cx != null && ent.cy != null && ent.radius) {
        if (!obj) {
          const g = this.add.graphics();
          this.entityGfx.set(ent.id, g);
          obj = g;
        }
        const g = obj as Phaser.GameObjects.Graphics;
        g.clear();
        g.fillStyle(0x2a4a6a, 1);
        g.fillCircle(ent.cx, ent.cy, ent.radius);
        g.lineStyle(3, 0x00d4ff, 0.3);
        g.strokeCircle(ent.cx, ent.cy, ent.radius);
      } else if (ent.kind === "beacon" && ent.x != null && ent.y != null) {
        if (!obj) {
          const g = this.add.graphics();
          this.entityGfx.set(ent.id, g);
          obj = g;
        }
        const g = obj as Phaser.GameObjects.Graphics;
        const r = ent.radius ?? 40;
        g.clear();
        g.lineStyle(2, 0x3dd68c, 0.9);
        g.strokeCircle(ent.x + r, ent.y + r, r);
        g.fillStyle(0x3dd68c, 0.2);
        g.fillCircle(ent.x + r, ent.y + r, r);
      } else if (ent.kind === "debris" && ent.x != null) {
        if (!obj) {
          const g = this.add.graphics();
          this.entityGfx.set(ent.id, g);
          obj = g;
        }
        const g = obj as Phaser.GameObjects.Graphics;
        g.clear();
        g.fillStyle(0xff8c42, 0.9);
        const ex = ent.x ?? 0;
        const ey = ent.y ?? 0;
        g.fillRect(ex, ey, ent.width ?? 28, ent.height ?? 28);
      }
    }

    const fuel = ship?.components?.fuel?.pct ?? 1;
    const hull = ship?.components?.hull?.pct ?? 1;
    this.callbacks.onHud({
      fuel,
      hull,
      altitude: state.altitude_km ?? 0,
      objective: state.objective?.label ?? "",
      progress: state.objective?.progress ?? 0,
    });

    for (const ev of state.events) {
      if (ev.name === "collision") {
        this.cameras.main.shake(120, 0.008);
      }
    }
  }
}
