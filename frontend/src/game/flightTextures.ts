import type Phaser from "phaser";
import type { FlightAssets } from "./flightAssets";
import type { MissionScene } from "../shared/missionPresentation";

function randomSequence(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function paintTexture(scene: Phaser.Scene, key: string, width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error("The flight renderer couldn't prepare its textures. Please reload and try again.");
  paint(texture.getContext());
  texture.refresh();
  return texture;
}

function paintLunarSphere(context: CanvasRenderingContext2D, surface: HTMLImageElement) {
  const source = document.createElement("canvas");
  source.width = 2048;
  source.height = 1024;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new Error("Your browser couldn't prepare the lunar surface.");
  sourceContext.drawImage(surface, 0, 0, source.width, source.height);
  const albedo = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const size = context.canvas.width;
  const radius = size / 2 - 1;
  const tilt = 40 * Math.PI / 180;
  const cosine = Math.cos(tilt);
  const sine = Math.sin(tilt);
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    const ny = (y - size / 2) / radius;
    if (Math.abs(ny) >= 1) continue;
    for (let x = 0; x < size; x += 1) {
      const nx = (x - size / 2) / radius;
      const distanceSquared = nx * nx + ny * ny;
      if (distanceSquared >= 1) continue;
      const nz = Math.sqrt(1 - distanceSquared);
      const surfaceY = ny * cosine + nz * sine;
      const surfaceZ = nz * cosine - ny * sine;
      const latitude = (Math.asin(Math.max(-1, Math.min(1, surfaceY))) / Math.PI + .5) * (source.height - 1);
      const sourceY = Math.min(source.height - 2, Math.floor(latitude));
      const blendY = latitude - sourceY;
      const longitude = (Math.atan2(nx, surfaceZ) / (Math.PI * 2) + 1.5) % 1 * source.width;
      const sourceX = Math.floor(longitude);
      const blendX = longitude - sourceX;
      const nextColumn = ((sourceX + 1) % source.width - sourceX) * 4;
      const first = (sourceY * source.width + sourceX) * 4;
      const next = first + source.width * 4;
      const light = Math.sqrt(.018 + .94 * Math.max(0, -.45 * nx - .35 * ny + .8216 * nz));
      const pixel = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const upper = albedo[first + channel] * (1 - blendX) + albedo[first + nextColumn + channel] * blendX;
        const lower = albedo[next + channel] * (1 - blendX) + albedo[next + nextColumn + channel] * blendX;
        image.data[pixel + channel] = (upper * (1 - blendY) + lower * blendY) * light;
      }
      image.data[pixel + 3] = Math.min(1, (1 - Math.sqrt(distanceSquared)) * radius) * 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function paintExhaust(context: CanvasRenderingContext2D, core: boolean) {
  const { width, height } = context.canvas;
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    const progress = y / height;
    const spread = core ? 22 * (1 - progress) + 1 : 7 + progress * 47;
    const falloff = Math.pow(1 - progress, core ? 1.4 : 1.65);
    for (let x = 0; x < width; x += 1) {
      const distance = (x - width / 2) / spread;
      const turbulence = core ? 1 : .87 + Math.sin(y * .13 + Math.sin(x * .18)) * .08 + Math.sin(y * .037) * .05;
      const opacity = Math.exp(-distance * distance * 1.7) * falloff * turbulence;
      const pixel = (y * width + x) * 4;
      image.data[pixel] = core ? 240 - progress * 66 : 83 + (1 - progress) * 73;
      image.data[pixel + 1] = core ? 248 - progress * 32 : 146 + (1 - progress) * 55;
      image.data[pixel + 2] = 255;
      image.data[pixel + 3] = opacity * (core ? 255 : 145);
    }
  }
  context.putImageData(image, 0, 0);
}

export function createFlightTextures(scene: Phaser.Scene, assets: FlightAssets, environment: MissionScene) {
  // Rasterize the shared SVG once; WebGL cannot upload every SVG image directly.
  paintTexture(scene, "explorer", 352, 560, (context) => {
    context.drawImage(assets.spacecraft, 0, 0, 352, 560);
  });
  paintTexture(scene, "space-sky", 1536, 1024, (context) => {
    context.fillStyle = "#030810";
    context.fillRect(0, 0, 1536, 1024);
    const cloud = (x: number, y: number, radius: number, color: string) => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "transparent");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1536, 1024);
    };
    cloud(1040, 500, 870, "#20385135");
    cloud(370, 270, 540, "#1b293a2b");
    cloud(1030, 920, 460, environment === "lunar" ? "#54575b12" : "#234b6b18");
    const random = randomSequence(73);
    for (let index = 0; index < 1400; index += 1) {
      const x = random() * 1536;
      const y = 740 - x * .28 + (random() - .5) * 150;
      context.fillStyle = `rgba(157, 185, 223, ${random() * .055})`;
      context.fillRect(x, y, 1, 1);
    }
  });

  for (let layer = 0; layer < 3; layer += 1) {
    paintTexture(scene, `stars-${layer}`, 1024, 1024, (context) => {
      const random = randomSequence(97 + layer * 13);
      for (let index = 0; index < 160 - layer * 55; index += 1) {
        const x = Math.floor(random() * 1024);
        const y = Math.floor(random() * 1024);
        const radius = .3 + random() * (.45 + layer * .16);
        context.fillStyle = `rgba(${layer === 2 ? "239, 228, 215" : "191, 209, 224"}, ${.16 + random() * .55})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        if (layer === 2 && index % 5 === 0) {
          const glow = context.createRadialGradient(x, y, 0, x, y, 5);
          glow.addColorStop(0, "#c6eaff65");
          glow.addColorStop(1, "transparent");
          context.fillStyle = glow;
          context.fillRect(x - 5, y - 5, 10, 10);
          context.fillStyle = "#afd3f522";
          context.fillRect(x - 4, y, 8, .5);
          context.fillRect(x, y - 4, .5, 8);
        }
      }
    });
  }

  const earth = paintTexture(scene, "earth-disc", 2048, 2048, (context) => {
    context.save();
    context.beginPath();
    context.arc(1024, 1024, 1022, 0, Math.PI * 2);
    context.clip();
    context.drawImage(assets.earth, 0, 0, 2048, 2048);
    const shade = context.createRadialGradient(570, 380, 250, 550, 350, 2050);
    shade.addColorStop(0, "#02091400");
    shade.addColorStop(.57, "#02091412");
    shade.addColorStop(.84, "#02071075");
    shade.addColorStop(1, "#01050aeb");
    context.fillStyle = shade;
    context.fillRect(0, 0, 2048, 2048);
    context.restore();
    context.strokeStyle = "#7fc6ee45";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(1024, 1024, 1022, 0, Math.PI * 2);
    context.stroke();
  });

  const moon = paintTexture(scene, "moon-disc", 1536, 1536, (context) => paintLunarSphere(context, assets.moon));

  paintTexture(scene, "planet-horizon", 2048, 960, (context) => {
    const radius = 2300;
    const centerY = 2410;
    context.save();
    context.beginPath();
    context.arc(1024, centerY, radius, 0, Math.PI * 2);
    context.clip();
    context.translate(1024, centerY);
    context.rotate(environment === "lunar" ? 0 : -.55);
    context.drawImage((environment === "lunar" ? moon : earth).canvas, -radius, -radius, radius * 2, radius * 2);
    context.restore();
    const shade = context.createLinearGradient(0, 180, 0, 960);
    shade.addColorStop(0, "#07101a00");
    shade.addColorStop(1, "#02081266");
    context.fillStyle = shade;
    context.globalCompositeOperation = "source-atop";
    context.fillRect(0, 0, 2048, 960);
    context.globalCompositeOperation = "source-over";
    if (environment !== "lunar") {
      context.strokeStyle = "#86d9ff75";
      context.lineWidth = 3;
      context.shadowColor = "#247fd0";
      context.shadowBlur = 19;
      context.beginPath();
      context.arc(1024, centerY, radius, 0, Math.PI * 2);
      context.stroke();
      context.lineWidth = 13;
      context.globalAlpha = .08;
      context.stroke();
    }
  });

  paintTexture(scene, "engine-glow", 128, 128, (context) => {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "#f0f8ff");
    gradient.addColorStop(.08, "#cceaffdc");
    gradient.addColorStop(.25, "#79b9ef68");
    gradient.addColorStop(.55, "#3976ad18");
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  });
  paintTexture(scene, "engine-plume", 192, 384, (context) => paintExhaust(context, false));
  paintTexture(scene, "engine-core", 96, 256, (context) => paintExhaust(context, true));

  for (let variant = 0; variant < 3; variant += 1) {
    paintTexture(scene, `asteroid-${variant}`, 256, 256, (context) => {
      const random = randomSequence(203 + variant * 27);
      context.beginPath();
      for (let index = 0; index < 21; index += 1) {
        const angle = index / 21 * Math.PI * 2;
        const radius = 91 + random() * 29;
        const x = 128 + Math.cos(angle) * radius;
        const y = 128 + Math.sin(angle) * radius;
        if (!index) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.save();
      context.clip();
      const rock = context.createRadialGradient(63, 40, 8, 158, 164, 170);
      rock.addColorStop(0, "#b7b9b1");
      rock.addColorStop(.3, "#8b908c");
      rock.addColorStop(.65, "#4e595c");
      rock.addColorStop(1, "#101c27");
      context.fillStyle = rock;
      context.fill();
      context.globalCompositeOperation = "soft-light";
      context.drawImage(assets.moon, 310 + variant * 390, 240 + variant * 75, 320, 320, 0, 0, 256, 256);
      context.globalCompositeOperation = "source-over";
      for (let index = 0; index < 450; index += 1) {
        const x = random() * 256;
        const y = random() * 256;
        context.fillStyle = index % 2 ? "#eef0d719" : "#07101924";
        context.fillRect(x, y, 1 + random() * 2, .5 + random());
      }
      for (let index = 0; index < 5; index += 1) {
        const x = random() * 256;
        const y = random() * 256;
        const length = 12 + random() * 29;
        context.strokeStyle = "#111b2270";
        context.lineWidth = .8 + random();
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + length * .4, y + length * .3);
        context.lineTo(x + length * .65, y + length * .2);
        context.lineTo(x + length, y + length * .65);
        context.stroke();
      }
      context.restore();
    });
  }
}
