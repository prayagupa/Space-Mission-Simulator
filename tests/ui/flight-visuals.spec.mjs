import { test, expect } from "@playwright/test";

const trainingObjective = { type: "altitude_band", label: "Hold altitude \u2265 80 km for 5 seconds", altitude_min_km: 80 };
const scenes = [
  { slug: "tutorial-first-ignition", name: "First Ignition", environment: "launch", objective: trainingObjective, ship: { x: 1900, y: 3600 }, entities: [] },
  {
    slug: "low-earth-insertion", name: "Low Earth Insertion", environment: "orbit",
    objective: { type: "orbit_band", label: "Maintain orbit 200\u2013280 km for 5 seconds", peri_km: 200, apo_km: 280 },
    ship: { x: 1976, y: 1750 },
    entities: [{ id: "planet", kind: "planet", cx: 2000, cy: 2800, radius: 900 }, { id: "goal_band", kind: "orbit_band", peri_km: 200, apo_km: 280 }],
  },
  {
    slug: "debris-field", name: "Debris Field", environment: "debris",
    objective: { type: "reach_beacon", label: "Reach the beacon", target_distance: 70 },
    ship: { x: 1600, y: 2200 },
    entities: [
      { id: "beacon", kind: "beacon", x: 1640, y: 2070, radius: 50 },
      { id: "debris1", kind: "debris", x: 1570, y: 2100, width: 28, height: 28 },
      { id: "debris2", kind: "debris", x: 1670, y: 2260, width: 28, height: 28 },
      { id: "debris3", kind: "debris", x: 1500, y: 2180, width: 28, height: 28 },
    ],
  },
  {
    slug: "asteroid-survey", name: "Asteroid Survey", environment: "asteroid",
    objective: { type: "orbit_band", label: "Survey orbit 150\u2013220 km for 6 seconds", peri_km: 150, apo_km: 220 },
    ship: { x: 1976, y: 1750 },
    entities: [
      { id: "planet", kind: "planet", cx: 2000, cy: 2600, radius: 700 },
      { id: "goal_band", kind: "orbit_band", peri_km: 150, apo_km: 220 },
      { id: "debris1", kind: "debris", x: 1930, y: 1720, width: 28, height: 28 },
      { id: "debris2", kind: "debris", x: 2080, y: 1700, width: 28, height: 28 },
    ],
  },
  {
    slug: "moon-landing", name: "Moon Landing", environment: "lunar",
    objective: { type: "reach_beacon", label: "Soft-land on the lunar beacon", target_distance: 55 },
    ship: { x: 2000, y: 3500 },
    entities: [{ id: "beacon", kind: "beacon", x: 1950, y: 3650, radius: 55 }],
  },
];

function snapshot(scene, { fuel = .82, angle = -Math.PI / 2 } = {}) {
  return {
    type: "state", tick: 1, status: "active",
    entities: [
      { id: "ship", kind: "ship", ...scene.ship, angle, components: { fuel: { pct: fuel }, hull: { pct: 1 } } },
      ...scene.entities,
    ],
    events: [],
    objective: { label: scene.objective.label, progress: 0 },
    altitude_km: (4000 - scene.ship.y - 24) / 10,
  };
}

// Fixed server-shaped poses isolate visual regressions; mission-control.spec runs real physics.
async function launchVisualFixture(page, scene = scenes[0]) {
  const errors = [];
  let socket;
  let closed = false;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /WebGL.*INVALID_|bad image data/.test(message.text())) errors.push(message.text());
  });
  await page.route("**/api/v1/missions", async (route) => {
    const response = await route.fetch();
    const catalog = await response.json();
    await route.fulfill({ json: { missions: catalog.missions.map((mission) => ({ ...mission, unlocked: true })) } });
  });
  await page.route(`**/api/v1/missions/${scene.slug}`, (route) => route.fulfill({
    json: {
      slug: scene.slug, name: scene.name, difficulty: 1, briefing: "Visual rendering fixture.",
      objective: scene.objective,
      loadout: { modules: [{ id: "standard_tank", name: "Standard Fuel Tank", mass: 10 }], mass_budget: 100 },
    },
  }));
  await page.route(`**/api/v1/missions/${scene.slug}/runs`, (route) => route.fulfill({
    json: { run_id: "visual-flight", mission_slug: scene.slug, ws_url: "/ws/mission/visual-flight" },
  }));
  await page.routeWebSocket("**/ws/mission/visual-flight", (connection) => {
    socket = connection;
    connection.onClose(() => { closed = true; });
    connection.send(JSON.stringify(snapshot(scene)));
  });
  await page.goto(`/missions/${scene.slug}/hangar`);
  await page.getByRole("button", { name: "Launch mission", exact: true }).click();
  await expect(page.getByText("FLIGHT LINK ACTIVE", { exact: true })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Fuel remaining" })).toHaveAttribute("aria-valuenow", "82");
  await page.evaluate(() => document.fonts.ready);
  expect(socket).toBeDefined();
  return { errors, send: (state) => socket.send(JSON.stringify(state)), isClosed: () => closed };
}

async function returnToHangar(page) {
  await page.getByRole("button", { name: "Hangar", exact: true }).click();
  await page.getByRole("button", { name: "Return to hangar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
}

for (const scene of scenes) {
  test(`flight artwork: detailed spacecraft in the ${scene.environment} environment`, async ({ page }) => {
    const fixture = await launchVisualFixture(page, scene);
    await page.keyboard.down("w");
    await expect(page.getByText("PROPULSION ACTIVE", { exact: true })).toBeVisible();
    await expect(page.locator(".flight-viewport")).toHaveScreenshot(`flight-${scene.environment}.png`, { maxDiffPixels: 100 });
    await page.keyboard.up("w");
    expect(fixture.errors).toEqual([]);
    await returnToHangar(page);
    await expect.poll(fixture.isClosed).toBe(true);
    await expect(page.locator(".flight-canvas canvas")).toHaveCount(0);
  });
}

test("engine artwork stops on release and empty fuel, and the shared spacecraft rotates", async ({ page }) => {
  const fixture = await launchVisualFixture(page);
  const canvas = await page.locator(".flight-canvas canvas").boundingBox();
  expect(canvas).not.toBeNull();
  const clip = { x: Math.floor(canvas.x + canvas.width / 2 - 80), y: Math.floor(canvas.y + canvas.height / 2 - 85), width: 160, height: 230 };
  await expect(page).toHaveScreenshot("flight-spacecraft-closeup.png", { clip, maxDiffPixels: 30 });
  const capture = () => page.screenshot({ clip });
  const idle = await capture();
  await page.keyboard.down("w");
  await expect(page.getByText("PROPULSION ACTIVE", { exact: true })).toBeVisible();
  await expect.poll(async () => Buffer.compare(await capture(), idle)).not.toBe(0);
  await page.keyboard.up("w");
  await expect.poll(async () => Buffer.compare(await capture(), idle)).toBe(0);
  await page.keyboard.down("w");
  await expect(page.getByText("PROPULSION ACTIVE", { exact: true })).toBeVisible();
  fixture.send(snapshot(scenes[0], { fuel: 0 }));
  await expect(page.getByText("FUEL DEPLETED", { exact: true })).toBeVisible();
  await expect.poll(async () => Buffer.compare(await capture(), idle)).toBe(0);
  await page.keyboard.up("w");
  fixture.send(snapshot(scenes[0], { angle: 0 }));
  await expect(page.getByRole("meter", { name: "Fuel remaining" })).toHaveAttribute("aria-valuenow", "82");
  await expect(page.locator(".flight-viewport")).toHaveScreenshot("flight-rotation.png", { maxDiffPixels: 100 });
  expect(fixture.errors).toEqual([]);
});

for (const artwork of ["explorer.svg", "earth-flight.webp", "moon-surface.webp"]) {
  test(`missing ${artwork} blocks run allocation and can retry without reloading`, async ({ page }) => {
    let runs = 0;
    page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith("/runs")) runs += 1; });
    const pattern = `**/images/${artwork}`;
    await page.route(pattern, (route) => route.abort("failed"));
    await page.goto("/missions/tutorial-first-ignition/hangar");
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("The flight deck couldn't be prepared.");
    expect(runs).toBe(0);
    await page.unroute(pattern);
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await expect(page.getByText("FLIGHT LINK ACTIVE", { exact: true })).toBeVisible();
    expect(runs).toBe(1);
    await returnToHangar(page);
  });
}

test("stalled spacecraft artwork times out before allocating a run and can retry", async ({ page }) => {
  let release;
  let runs = 0;
  const stalled = new Promise((resolve) => { release = resolve; });
  page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith("/runs")) runs += 1; });
  await page.route("**/images/explorer.svg", async (route) => {
    await stalled;
    await route.abort("timedout");
  });
  try {
    await page.goto("/missions/tutorial-first-ignition/hangar", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("The flight deck couldn't be prepared.", { timeout: 13_000 });
    expect(runs).toBe(0);
    release();
    await page.unrouteAll({ behavior: "wait" });
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await expect(page.getByText("FLIGHT LINK ACTIVE", { exact: true })).toBeVisible();
    expect(runs).toBe(1);
    await returnToHangar(page);
  } finally {
    release();
  }
});

test("a renderer startup failure releases the allocated run and removes its canvas", async ({ page }) => {
  const messages = [];
  let sockets = 0;
  let closed = false;
  await page.addInitScript(() => {
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...coordinates) {
      if (source instanceof HTMLImageElement && source.src.endsWith("/images/explorer.svg")) {
        throw new Error("Forced spacecraft texture failure.");
      }
      return drawImage.call(this, source, ...coordinates);
    };
  });
  await page.route("**/api/v1/missions/tutorial-first-ignition/runs", (route) => route.fulfill({
    json: { run_id: "failed-renderer", mission_slug: "tutorial-first-ignition", ws_url: "/ws/mission/failed-renderer" },
  }));
  await page.routeWebSocket("**/ws/mission/failed-renderer", (socket) => {
    sockets += 1;
    socket.onMessage(async (message) => {
      const input = JSON.parse(String(message));
      messages.push(input);
      if (input.type === "abort") await socket.close({ code: 1000 });
    });
    socket.onClose(() => { closed = true; });
  });
  await page.goto("/missions/tutorial-first-ignition/hangar");
  await page.getByRole("button", { name: "Launch mission", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Forced spacecraft texture failure.");
  await expect.poll(() => messages.filter((message) => message.type === "abort").length).toBe(1);
  await expect.poll(() => closed).toBe(true);
  expect(sockets).toBe(1);
  await expect(page.locator(".flight-canvas canvas")).toHaveCount(0);
  await page.keyboard.press("w");
  await expect(page.getByText("PROPULSION ACTIVE", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Return to hangar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
});

test("short landscape flight keeps the spacecraft viewport and controls usable", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const fixture = await launchVisualFixture(page);
  const canvas = await page.locator(".flight-canvas canvas").boundingBox();
  expect(canvas).not.toBeNull();
  expect(canvas.height).toBeGreaterThan(160);
  for (const name of ["Rotate left, hold A or left arrow", "Thrust, hold W or up arrow", "Rotate right, hold D or right arrow"]) {
    await expect(page.getByRole("button", { name })).toBeInViewport();
  }
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.locator(".flight-viewport")).toHaveScreenshot("flight-landscape.png", { maxDiffPixels: 100 });
  expect(fixture.errors).toEqual([]);
});

test("animated exhaust survives repeated real flights without retaining canvases or sockets", async ({ page }) => {
  const sockets = [];
  const errors = [];
  const photographRequests = [];
  await page.emulateMedia({ reducedMotion: "no-preference" });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/\/images\/(?:earth-flight|moon-surface)\.webp$/.test(request.url())) photographRequests.push(request.url());
  });
  page.on("websocket", (socket) => {
    if (!socket.url().includes("/ws/mission/")) return;
    const connection = { closed: false };
    sockets.push(connection);
    socket.on("close", () => { connection.closed = true; });
  });
  await page.goto("/missions/tutorial-first-ignition/hangar");
  for (let launch = 0; launch < 2; launch += 1) {
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await expect(page.getByText("FLIGHT LINK ACTIVE", { exact: true })).toBeVisible();
    await expect(page.locator(".flight-canvas canvas")).toHaveCount(1);
    await page.keyboard.down("w");
    await expect(page.getByText("PROPULSION ACTIVE", { exact: true })).toBeVisible();
    await expect.poll(async () => Number(await page.getByRole("meter", { name: "Fuel remaining" }).getAttribute("aria-valuenow") ?? 100)).toBeLessThan(95);
    await page.keyboard.up("w");
    await returnToHangar(page);
    await expect(page.locator(".flight-canvas canvas")).toHaveCount(0);
    await expect.poll(() => sockets.filter((socket) => socket.closed).length).toBe(launch + 1);
  }
  expect(sockets).toHaveLength(2);
  expect(photographRequests).toHaveLength(2);
  expect(errors).toEqual([]);
});
