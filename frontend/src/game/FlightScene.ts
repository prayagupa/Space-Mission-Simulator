import Phaser from "phaser";
import type { FlightGameOptions } from "./createGame";
import { createFlightTextures } from "./flightTextures";

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
  peri_km?: number;
  apo_km?: number;
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

type EntityVisual = {
  kind: string;
  root: Phaser.GameObjects.Container;
  x: number;
  y: number;
};

// Presentation scale only. Ship centers, obstacle sizes, and targets stay server-owned.
const WORLD_SCALE = 2.4;
const SHIP_BODY_SIZE = 48;

export default class FlightScene extends Phaser.Scene {
  private options!: FlightGameOptions;
  private ship?: Phaser.GameObjects.Container;
  private sky?: Phaser.GameObjects.Image;
  private horizon?: Phaser.GameObjects.Image;
  private stars: Phaser.GameObjects.TileSprite[] = [];
  private flames: Phaser.GameObjects.Image[] = [];
  private flameCores: Phaser.GameObjects.Image[] = [];
  private engineGlow?: Phaser.GameObjects.Image;
  private exhaust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private collisionSparks?: Phaser.GameObjects.Particles.ParticleEmitter;
  private trail?: Phaser.GameObjects.Graphics;
  private guide?: Phaser.GameObjects.Graphics;
  private navigation?: Phaser.GameObjects.Graphics;
  private vesselLabel?: Phaser.GameObjects.Text;
  private targetLabel?: Phaser.GameObjects.Text;
  private orbitBand?: Phaser.GameObjects.Graphics;
  private entities = new Map<string, EntityVisual>();
  private trailPoints: { x: number; y: number }[] = [];
  private target?: { x: number; y: number; label: string };
  private shipTarget = { x: 0, y: 0, angle: -Math.PI / 2 };
  private altitude = 0;
  private fuel = 1;
  private hull = 1;
  private ready = false;
  private receivedState = false;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private hasPlanet = false;

  constructor() {
    super("FlightScene");
  }

  init() {
    this.options = this.game.registry.get("flightOptions") as FlightGameOptions;
  }

  create() {
    try {
      createFlightTextures(this, this.options.assets, this.options.environment);
      this.sky = this.add.image(0, 0, "space-sky").setOrigin(0).setScrollFactor(0).setDepth(-100);
      for (let layer = 0; layer < 3; layer += 1) {
        this.stars.push(this.add.tileSprite(0, 0, 1, 1, `stars-${layer}`).setOrigin(0).setScrollFactor(0).setDepth(-90 + layer));
      }
      this.horizon = this.add.image(0, 0, "planet-horizon").setOrigin(.5, 0).setScrollFactor(0).setDepth(-50);
      this.orbitBand = this.add.graphics().setDepth(-15);
      this.trail = this.add.graphics().setDepth(-5);
      this.guide = this.add.graphics().setScrollFactor(0).setDepth(-3);
      this.navigation = this.add.graphics().setScrollFactor(0).setDepth(20);
      const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: "monospace", fontSize: "10px", color: "#b6c9df", lineSpacing: 6, letterSpacing: 2, resolution: 2 };
      this.vesselLabel = this.add.text(0, 0, "EXPLORER / 01\nMANUAL FLIGHT", labelStyle).setScrollFactor(0).setDepth(21);
      this.targetLabel = this.add.text(0, 0, "", { ...labelStyle, color: "#cce5d5", letterSpacing: 1, align: "center" }).setScrollFactor(0).setDepth(21);
      this.buildSpacecraft();
      this.layout();
      this.ready = true;
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.ready = false;
        this.entities.clear();
        this.trailPoints.length = 0;
        this.stars.length = 0;
        this.flames.length = 0;
        this.flameCores.length = 0;
      });
      this.options.onReady(this);
    } catch (reason) {
      this.ready = false;
      this.options.onError(reason instanceof Error ? reason.message : "The flight renderer couldn't start. Please return to the hangar.");
    }
  }

  private buildSpacecraft() {
    this.ship = this.add.container(0, 0).setDepth(10).setVisible(false).setName("explorer-spacecraft");
    this.engineGlow = this.add.image(0, 25 * WORLD_SCALE, "engine-glow")
      .setDisplaySize(48 * WORLD_SCALE, 48 * WORLD_SCALE).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.ship.add(this.engineGlow);
    for (const x of [-7.7, 0, 7.7]) {
      const nozzleY = (x ? 20.8 : 23) * WORLD_SCALE;
      const flame = this.add.image(x * WORLD_SCALE, nozzleY, "engine-plume")
        .setOrigin(.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      const core = this.add.image(x * WORLD_SCALE, nozzleY, "engine-core")
        .setOrigin(.5, 0).setDisplaySize((x ? 6 : 14) * WORLD_SCALE, (x ? 14 : 28) * WORLD_SCALE)
        .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.flames.push(flame);
      this.flameCores.push(core);
      this.ship.add([flame, core]);
    }
    this.ship.add(this.add.image(0, 0, "explorer")
      .setDisplaySize(SHIP_BODY_SIZE * 176 / 280 * WORLD_SCALE, SHIP_BODY_SIZE * WORLD_SCALE).setName("explorer-hull"));
    this.exhaust = this.add.particles(0, 0, "engine-glow", {
      speed: { min: 110, max: 150 },
      angle: { onEmit: () => Phaser.Math.RadToDeg(this.shipTarget.angle) + 180 + Phaser.Math.Between(-9, 9) },
      lifespan: { min: 250, max: 600 },
      scale: { start: .08, end: .24 },
      alpha: { start: .1, end: 0 },
      frequency: 30,
      maxParticles: 48,
      maxAliveParticles: 40,
      emitting: false,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(5);
    this.collisionSparks = this.add.particles(0, 0, "engine-glow", {
      speed: { min: 80, max: 180 },
      lifespan: 300,
      scale: { start: .12, end: 0 },
      tint: 0xffa784,
      frequency: -1,
      maxParticles: 24,
      maxAliveParticles: 24,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(11);
  }

  private layout() {
    this.viewportWidth = this.scale.width;
    this.viewportHeight = this.scale.height;
    this.sky?.setDisplaySize(this.viewportWidth, this.viewportHeight);
    for (const layer of this.stars) layer.setSize(this.viewportWidth, this.viewportHeight);
    const horizonWidth = Math.max(this.viewportWidth * 1.3, this.viewportHeight * 1.7);
    if (this.horizon) this.horizon.setDisplaySize(horizonWidth, horizonWidth * this.horizon.height / this.horizon.width);
    const labelSize = this.viewportWidth < 600 ? 7 : 9;
    this.vesselLabel?.setFontSize(labelSize);
    this.targetLabel?.setFontSize(labelSize);
  }

  private addEntity(entity: EntitySnapshot, x: number, y: number): EntityVisual | undefined {
    if (!["planet", "beacon", "debris"].includes(entity.kind)) return;
    const root = this.add.container(x, y).setName(entity.id);
    if (entity.kind === "planet") {
      const diameter = (entity.radius ?? 1) * 2 * WORLD_SCALE;
      const rockyBody = this.options.environment === "asteroid" || this.options.environment === "lunar";
      root.add(this.add.image(0, 0, rockyBody ? "moon-disc" : "earth-disc").setDisplaySize(diameter, diameter));
      root.setDepth(-30);
    } else if (entity.kind === "debris") {
      const variant = [...entity.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
      root.add(this.add.image(0, 0, `asteroid-${variant}`)
        .setDisplaySize((entity.width ?? 28) * WORLD_SCALE, (entity.height ?? 28) * WORLD_SCALE));
      root.setDepth(3);
    } else {
      const radius = (entity.radius ?? 40) * WORLD_SCALE;
      const ring = this.add.graphics();
      ring.fillStyle(0x8dc6bb, .04).fillCircle(0, 0, radius);
      ring.lineStyle(1.5, 0xb5e3cf, .6).strokeCircle(0, 0, radius);
      ring.lineStyle(1, 0xb5e3cf, .15).strokeCircle(0, 0, radius * .65);
      for (let index = 0; index < 8; index += 1) {
        const angle = index / 8 * Math.PI * 2;
        ring.lineStyle(2, 0xb5e3cf, .6).lineBetween(Math.cos(angle) * radius * .88, Math.sin(angle) * radius * .88, Math.cos(angle) * radius * 1.05, Math.sin(angle) * radius * 1.05);
      }
      ring.lineStyle(2, 0xccefe3, .9).lineBetween(-10, 0, 10, 0).lineBetween(0, -10, 0, 10);
      root.add(ring);
      root.add(this.add.text(0, radius + 17, this.options.environment === "lunar" ? "LUNAR BEACON" : "RECOVERY BEACON", {
        fontFamily: "monospace", fontSize: "10px", color: "#bedbce", letterSpacing: 2, resolution: 2,
      }).setOrigin(.5, 0));
      root.setDepth(1);
    }
    return { kind: entity.kind, root, x, y };
  }

  applyState(state: StateSnapshot) {
    if (!this.ready || !this.ship) return;
    const ship = state.entities.find((entity) => entity.kind === "ship");
    if (!ship || ship.x == null || ship.y == null) return;
    this.shipTarget = {
      x: (ship.x + SHIP_BODY_SIZE / 2) * WORLD_SCALE,
      y: (ship.y + SHIP_BODY_SIZE / 2) * WORLD_SCALE,
      angle: ship.angle ?? -Math.PI / 2,
    };
    if (!this.receivedState) {
      this.ship.setPosition(this.shipTarget.x, this.shipTarget.y).setRotation(this.shipTarget.angle + Math.PI / 2).setVisible(true);
      this.receivedState = true;
    }
    this.fuel = ship.components?.fuel?.pct ?? 1;
    this.hull = ship.components?.hull?.pct ?? 1;
    this.altitude = state.altitude_km ?? 0;
    const planet = state.entities.find((entity) => entity.kind === "planet");
    this.hasPlanet = !!planet;
    this.horizon?.setVisible(!this.hasPlanet);
    const ids = new Set(state.entities.map((entity) => entity.id));
    for (const [id, visual] of this.entities) {
      if (!ids.has(id)) {
        visual.root.destroy();
        this.entities.delete(id);
      }
    }
    this.target = undefined;
    for (const entity of state.entities) {
      const x = entity.kind === "planet" ? entity.cx : entity.x;
      const y = entity.kind === "planet" ? entity.cy : entity.y;
      if (x == null || y == null || entity.kind === "ship") continue;
      const centerX = (x + (entity.kind === "debris" ? (entity.width ?? 28) / 2 : 0)) * WORLD_SCALE;
      const centerY = (y + (entity.kind === "debris" ? (entity.height ?? 28) / 2 : 0)) * WORLD_SCALE;
      let visual = this.entities.get(entity.id);
      if (!visual) {
        visual = this.addEntity(entity, centerX, centerY);
        if (visual) this.entities.set(entity.id, visual);
      }
      if (visual) {
        visual.x = centerX;
        visual.y = centerY;
      }
      if (entity.kind === "beacon") this.target = { x: centerX, y: centerY, label: this.options.environment === "lunar" ? "LANDING BEACON" : "RECOVERY BEACON" };
    }
    const band = state.entities.find((entity) => entity.kind === "orbit_band");
    this.orbitBand?.clear();
    if (planet?.cx != null && planet.cy != null && planet.radius != null && band?.peri_km != null && band.apo_km != null) {
      const x = planet.cx * WORLD_SCALE;
      const y = planet.cy * WORLD_SCALE;
      const inner = (planet.radius + band.peri_km * 10) * WORLD_SCALE;
      const outer = (planet.radius + band.apo_km * 10) * WORLD_SCALE;
      this.orbitBand?.lineStyle(2, 0x9dceaf, .3).strokeCircle(x, y, inner).strokeCircle(x, y, outer);
      const direction = Math.atan2(this.shipTarget.y - y, this.shipTarget.x - x);
      this.target = { x: x + Math.cos(direction) * (inner + outer) / 2, y: y + Math.sin(direction) * (inner + outer) / 2, label: "TARGET ORBIT" };
    }
    const targetAltitude = this.options.objective.altitude_min_km;
    if (this.options.objective.type === "altitude_band" && targetAltitude != null) {
      this.target = { x: this.shipTarget.x, y: this.shipTarget.y - (targetAltitude - this.altitude) * 10 * WORLD_SCALE, label: `${targetAltitude} KM ALTITUDE` };
    }
    const lastPoint = this.trailPoints.at(-1);
    if (!lastPoint || Phaser.Math.Distance.Between(lastPoint.x, lastPoint.y, this.shipTarget.x, this.shipTarget.y) > 10) {
      this.trailPoints.push({ x: this.shipTarget.x, y: this.shipTarget.y });
      if (this.trailPoints.length > 48) this.trailPoints.shift();
    }
    this.options.onHud({ fuel: this.fuel, hull: this.hull, altitude: this.altitude, objective: state.objective.label, progress: state.objective.progress });
    if (state.events.some((event) => event.name === "collision") && !this.options.reducedMotion) {
      this.cameras.main.shake(100, .003);
      this.collisionSparks?.explode(12, this.ship.x, this.ship.y);
    }
  }

  update(time: number, delta: number) {
    if (!this.ready || !this.ship) return;
    if (this.scale.width !== this.viewportWidth || this.scale.height !== this.viewportHeight) this.layout();
    const width = this.viewportWidth;
    const height = this.viewportHeight;
    this.horizon?.setPosition(width * .5, height * .52 + Math.max(0, this.altitude) * height / 1500);
    if (!this.receivedState) return;
    const blend = 1 - Math.exp(-Math.min(delta, 100) / 35);
    this.ship.x = Phaser.Math.Linear(this.ship.x, this.shipTarget.x, blend);
    this.ship.y = Phaser.Math.Linear(this.ship.y, this.shipTarget.y, blend);
    this.ship.rotation += Phaser.Math.Angle.Wrap(this.shipTarget.angle + Math.PI / 2 - this.ship.rotation) * blend;
    this.cameras.main.centerOn(this.ship.x, this.ship.y);
    for (const visual of this.entities.values()) {
      visual.root.x = Phaser.Math.Linear(visual.root.x, visual.x, blend);
      visual.root.y = Phaser.Math.Linear(visual.root.y, visual.y, blend);
    }
    for (const [index, layer] of this.stars.entries()) {
      layer.tilePositionX = this.cameras.main.scrollX * (.0008 + index * .0015);
      layer.tilePositionY = this.cameras.main.scrollY * (.0008 + index * .0015);
    }
    const burning = this.options.getInput().thrust && this.fuel > 0 && this.hull > 0;
    const flutter = this.options.reducedMotion ? 1 : .985 + Math.sin(time * .028) * .015 + Math.sin(time * .071) * .006;
    const expansion = this.options.environment === "launch" ? Phaser.Math.Clamp(this.altitude / 100, 0, 1) : 1;
    for (const [index, flame] of this.flames.entries()) {
      const main = index === 1;
      flame.setVisible(burning).setDisplaySize(
        (main ? 22 + expansion * 12 : 10 + expansion * 5) * WORLD_SCALE,
        (main ? 50 + expansion * 10 : 23 + expansion * 5) * WORLD_SCALE * flutter,
      );
    }
    for (const core of this.flameCores) core.setVisible(burning).setAlpha(flutter);
    this.engineGlow?.setAlpha(burning ? .36 : 0);
    if (this.exhaust) {
      const angle = this.ship.rotation - Math.PI / 2;
      this.exhaust.setPosition(this.ship.x - Math.cos(angle) * 25 * WORLD_SCALE, this.ship.y - Math.sin(angle) * 25 * WORLD_SCALE);
      this.exhaust.emitting = burning && !this.options.reducedMotion;
    }
    this.trail?.clear();
    for (let index = 1; index < this.trailPoints.length; index += 1) {
      const from = this.trailPoints[index - 1];
      const to = this.trailPoints[index];
      this.trail?.lineStyle(1, 0xa8c2dc, index / this.trailPoints.length * .18).lineBetween(from.x, from.y, to.x, to.y);
    }
    this.drawNavigation(width, height);
  }

  private drawNavigation(width: number, height: number) {
    if (!this.ship || !this.navigation || !this.guide) return;
    const x = width / 2;
    const y = height / 2;
    this.navigation.clear();
    this.guide.clear();
    this.guide.lineStyle(1, 0xa6c5e1, .06).strokeCircle(x, y, 107).strokeCircle(x, y, 185);
    for (let index = 0; index < 16; index += 1) {
      const angle = index / 16 * Math.PI * 2;
      this.guide.lineStyle(1, 0xa6c5e1, index % 4 ? .1 : .3).lineBetween(
        x + Math.cos(angle) * 103, y + Math.sin(angle) * 103,
        x + Math.cos(angle) * (index % 4 ? 109 : 115), y + Math.sin(angle) * (index % 4 ? 109 : 115),
      );
    }
    const labelX = width < 600 ? x + 52 : x + 92;
    this.vesselLabel?.setPosition(labelX, y - 35).setAlpha(.8);
    this.navigation.lineStyle(1, 0xb6cada, .3).lineBetween(x + 34, y - 5, labelX - 8, y - 18);
    this.navigation.lineBetween(labelX - 8, y - 18, labelX + (width < 600 ? 68 : 110), y - 18);
    this.targetLabel?.setVisible(!!this.target);
    if (!this.target) return;
    const dx = this.target.x - this.ship.x;
    const dy = this.target.y - this.ship.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 70) {
      this.targetLabel?.setVisible(false);
      return;
    }
    const margin = width < 600 ? 82 : 105;
    const verticalMargin = height < 360 ? 26 : 105;
    const edge = Math.min(1, Math.max(12, width / 2 - margin) / Math.max(Math.abs(dx), 1), Math.max(12, height / 2 - verticalMargin) / Math.max(Math.abs(dy), 1));
    const targetX = x + dx * edge;
    const targetY = y + dy * edge;
    this.navigation.lineStyle(1, 0xaedcc2, .5).strokeCircle(targetX, targetY, 6);
    this.navigation.lineStyle(1, 0xaedcc2, .15).strokeCircle(targetX, targetY, 13);
    const direction = Math.atan2(dy, dx);
    this.navigation.lineStyle(1.5, 0xbddfc8, .8).lineBetween(targetX, targetY, targetX + Math.cos(direction) * 18, targetY + Math.sin(direction) * 18);
    this.targetLabel?.setText(this.target.label);
    if (height < 360) {
      this.targetLabel?.setOrigin(dx > 0 ? 1 : 0, .5).setPosition(targetX + (dx > 0 ? -22 : 22), targetY);
    } else {
      this.targetLabel?.setOrigin(.5, dy > 0 ? 1 : 0).setPosition(targetX, targetY + (dy > 0 ? -22 : 23));
    }
  }
}
