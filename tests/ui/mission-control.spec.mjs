import { test, expect } from "@playwright/test";

async function openFlightDeck(page, path = "/") {
  await page.goto(path);
  await expect(page.getByText("SYSTEMS ONLINE", { exact: true })).toBeVisible();
}

function deferred() {
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  return { promise, release };
}

function observeRunRequests(page) {
  const requests = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/runs")) requests.push(request.url());
  });
  return requests;
}

test("overview leads through briefing, loadout changes, and a refreshable hangar", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await openFlightDeck(page);
  await expect(page.getByRole("heading", { name: "Mission control.", exact: true })).toBeVisible();
  await expect(page.locator(".stat-value").first()).toContainText("01");
  await page.getByRole("link", { name: "Start your mission" }).click();
  await expect(page.getByRole("heading", { name: "First Ignition.", exact: true })).toBeVisible();
  await expect(page.locator(".briefing-copy")).not.toContainText("**");
  await expect(page.locator(".mission-steps [aria-current='step']")).toContainText("Mission briefing");
  await page.getByRole("link", { name: "Configure your craft" }).click();
  const mass = page.getByRole("meter", { name: "Spacecraft mass" });
  await expect(mass).toHaveAttribute("aria-valuenow", "45");
  await page.getByRole("checkbox", { name: /Reinforced Hull/ }).uncheck();
  await expect(mass).toHaveAttribute("aria-valuenow", "30");
  await page.getByRole("checkbox", { name: /Standard Fuel Tank/ }).uncheck();
  await expect(mass).toHaveAttribute("aria-valuenow", "20");
  await page.reload();
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
  await expect(mass).toHaveAttribute("aria-valuenow", "45");
  await expect(page.getByRole("checkbox", { name: /Reinforced Hull/ })).toBeChecked();
  expect(errors).toEqual([]);
});

test("mission filters, search, and locked prerequisites explain the next step", async ({ page }) => {
  await openFlightDeck(page, "/missions");
  await expect(page.locator(".mission-card")).toHaveCount(5);
  await page.getByRole("button", { name: /^Available/ }).click();
  await expect(page.locator(".mission-card")).toHaveCount(1);
  await page.getByRole("button", { name: /^Completed/ }).click();
  await expect(page.getByRole("heading", { name: "Your first achievement is out there." })).toBeVisible();
  await page.getByRole("button", { name: "Explore all missions" }).click();
  await page.getByRole("searchbox", { name: "Search missions" }).fill("low earth");
  await expect(page.locator(".mission-card")).toHaveCount(1);
  const locked = page.getByRole("article", { name: "Low Earth Insertion: locked" });
  await expect(locked).toContainText("Complete First Ignition to unlock");
  await locked.click();
  await expect(page).toHaveURL(/\/missions$/);
  await page.getByRole("searchbox", { name: "Search missions" }).fill("unlisted sector");
  await expect(page.getByRole("heading", { name: "No missions found." })).toBeVisible();
  await page.getByRole("button", { name: "Explore all missions" }).click();
  await expect(page.locator(".mission-card")).toHaveCount(5);
});

test("galaxy waypoints are keyboard accessible and locked routes stay locked", async ({ page }) => {
  await openFlightDeck(page, "/missions");
  await page.getByRole("button", { name: "Galaxy map", exact: true }).click();
  const waypoint = page.getByRole("button", { name: "First Ignition, view briefing", exact: true });
  await expect(waypoint).toHaveAttribute("tabindex", "0");
  await expect(page.getByRole("button", { name: "Low Earth Insertion, locked", exact: true })).toHaveAttribute("aria-disabled", "true");
  await waypoint.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "First Ignition.", exact: true })).toBeVisible();
});

test("flight guide has usable controls and a real route into training", async ({ page }) => {
  await openFlightDeck(page);
  await page.locator(".flight-school-card").click();
  await expect(page.getByRole("heading", { name: "Meet your flight controls" })).toBeVisible();
  await expect(page.locator(".guide-step")).toHaveCount(3);
  await page.getByRole("link", { name: "Let's take flight" }).click();
  await expect(page.getByRole("heading", { name: "First Ignition.", exact: true })).toBeVisible();
});

test("failed session setup is explicit and can reconnect without a reload", async ({ page }) => {
  let offline = true;
  let requests = 0;
  await page.route("**/api/v1/session/guest", async (route) => {
    requests += 1;
    if (offline) await route.fulfill({ status: 503, json: { detail: "Test connection interruption" } });
    else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Mission control is offline.");
  await expect(page.locator(".stat-value").first()).toContainText("--");
  expect(requests).toBe(1);
  offline = false;
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.getByText("SYSTEMS ONLINE", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".stat-value").first()).toContainText("01");
});

test("a daily challenge outage does not block regular missions", async ({ page }) => {
  await page.route("**/api/v1/daily-challenge", (route) => route.fulfill({ status: 503, json: { detail: "Daily challenge unavailable" } }));
  await openFlightDeck(page);
  await expect(page.locator(".daily-content")).toContainText("Today's challenge is unavailable.");
  await page.getByRole("link", { name: "Start your mission" }).click();
  await expect(page.getByRole("link", { name: "Configure your craft" })).toBeVisible();
});

test("mission load errors are recoverable and cannot launch an empty loadout", async ({ page }) => {
  let fail = true;
  await page.route("**/api/v1/missions/tutorial-first-ignition", async (route) => {
    if (fail) await route.fulfill({ status: 503, json: { detail: "Briefing is temporarily unavailable." } });
    else await route.continue();
  });
  await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
  await expect(page.getByRole("alert")).toContainText("Briefing is temporarily unavailable.");
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
  await expect(page.getByRole("checkbox")).toHaveCount(2);
});

test("launch failure keeps the selected craft and exposes a retryable error", async ({ page }) => {
  await page.route("**/api/v1/missions/tutorial-first-ignition/runs", (route) => route.fulfill({ status: 503, json: { detail: "Launch control is temporarily unavailable." } }));
  await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
  await page.getByRole("checkbox", { name: /Reinforced Hull/ }).uncheck();
  await page.getByRole("button", { name: "Launch mission", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Launch control is temporarily unavailable.");
  await expect(page).toHaveURL(/\/hangar$/);
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
  await expect(page.getByRole("meter", { name: "Spacecraft mass" })).toHaveAttribute("aria-valuenow", "30");
});

test("a failed flight download never creates a server run and is recoverable", async ({ page }) => {
  const requests = observeRunRequests(page);
  await page.route("**/FlightView*", (route) => route.abort("failed"));
  await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
  await page.getByRole("button", { name: "Launch mission", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("The flight deck couldn't be prepared.");
  expect(requests).toHaveLength(0);
  await expect(page).toHaveURL(/\/hangar$/);
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
  await page.unroute("**/FlightView*");
  await page.reload();
  await page.getByRole("button", { name: "Launch mission", exact: true }).click();
  await expect(page.getByText("FLIGHT LINK ACTIVE", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  await page.getByRole("button", { name: "Hangar", exact: true }).click();
  await page.getByRole("button", { name: "Return to hangar", exact: true }).click();
  await expect(page).toHaveURL(/\/hangar$/);
});

test("a stalled flight download has a bounded wait without allocating a run", async ({ page }) => {
  const requests = observeRunRequests(page);
  const received = deferred();
  const release = deferred();
  const finished = deferred();
  let downloads = 0;
  await page.route("**/FlightView*", async (route) => {
    downloads += 1;
    received.release();
    await release.promise;
    try { await route.abort("timedout"); } finally { finished.release(); }
  });
  await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
  await page.clock.install();
  try {
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await received.promise;
    await page.clock.runFor(15_001);
    await expect(page.getByRole("alert")).toContainText("The flight deck download timed out.");
    expect(requests).toHaveLength(0);
    await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("The flight deck download timed out.");
    expect(downloads).toBe(1);
    expect(requests).toHaveLength(0);
  } finally {
    release.release();
    await finished.promise;
  }
});

test("leaving during a flight preload cannot launch later", async ({ page }, testInfo) => {
  const requests = observeRunRequests(page);
  const received = deferred();
  const release = deferred();
  await page.route("**/FlightView*", async (route) => {
    received.release();
    await release.promise;
    await route.continue();
  });
  try {
    await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await received.promise;
    const navigation = page.getByRole("navigation", { name: testInfo.project.name === "phone" ? "Mobile navigation" : "Main navigation", exact: true });
    await navigation.getByRole("link", { name: /^Missions/ }).click();
    await expect(page).toHaveURL(/\/missions$/);
    release.release();
    await page.waitForLoadState("networkidle");
    expect(requests).toHaveLength(0);
    await expect(page).toHaveURL(/\/missions$/);
  } finally {
    release.release();
  }
});

test("leaving during run allocation cancels the real run without pulling you back into flight", async ({ page }, testInfo) => {
  const created = deferred();
  const release = deferred();
  let runId;
  let aborted = false;
  let closed = false;
  const cancellationErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("abandoned launch")) cancellationErrors.push(message.text());
  });
  page.on("websocket", (socket) => {
    if (!socket.url().endsWith(`/ws/mission/${runId}`)) return;
    socket.on("framesent", ({ payload }) => {
      if (JSON.parse(String(payload)).type === "abort") aborted = true;
    });
    socket.on("close", () => { closed = true; });
  });
  await page.route("**/api/v1/missions/tutorial-first-ignition/runs", async (route) => {
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    const run = await response.json();
    runId = run.run_id;
    created.release();
    await release.promise;
    await route.fulfill({ response });
  });
  try {
    await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await created.promise;
    const navigation = page.getByRole("navigation", { name: testInfo.project.name === "phone" ? "Mobile navigation" : "Main navigation", exact: true });
    await navigation.getByRole("link", { name: /^Missions/ }).click();
    await expect(page).toHaveURL(/\/missions$/);
    release.release();
    await expect.poll(() => aborted && closed).toBe(true);
    await expect(page).toHaveURL(/\/missions$/);
    await expect(page.locator(".flight-canvas canvas")).toHaveCount(0);
    expect(cancellationErrors).toEqual([]);
    const released = await page.evaluate((id) => new Promise((resolve) => {
      const socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/mission/${id}`);
      let opened = false;
      const timeout = setTimeout(() => { socket.close(); resolve(false); }, 5000);
      socket.onopen = () => { opened = true; socket.close(); };
      socket.onclose = () => { clearTimeout(timeout); resolve(!opened); };
      socket.onerror = () => { clearTimeout(timeout); resolve(!opened); };
    }), runId);
    expect(released).toBe(true);
  } finally {
    release.release();
  }
});

test("a direct flight link returns to a usable hangar without downloading the engine", async ({ page }) => {
  const rendererRequests = [];
  page.on("request", (request) => {
    if (/\/FlightView[^/]*\.(?:tsx|js)(?:\?|$)/.test(request.url())) rendererRequests.push(request.url());
  });
  await openFlightDeck(page, "/missions/tutorial-first-ignition/flight");
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/\/hangar$/);
  expect(rendererRequests).toHaveLength(0);
});

test("cockpit controls release outside buttons, reconcile opposite keys, and confirm leaving", async ({ page }, testInfo) => {
  const errors = [];
  const inputs = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("websocket", (socket) => {
    socket.on("framesent", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "input") inputs.push(message);
    });
  });
  await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
  await page.getByRole("button", { name: "Launch mission", exact: true }).click();
  await expect(page.getByText("FLIGHT LINK ACTIVE", { exact: true })).toBeVisible();
  await expect(page.locator(".flight-canvas canvas")).toBeVisible();
  await expect(page.getByRole("main", { name: "Mission flight deck" })).toBeFocused();
  await page.keyboard.down("a");
  await expect.poll(() => inputs.at(-1)?.rotate).toBe(-1);
  await page.keyboard.down("d");
  await expect.poll(() => inputs.at(-1)?.rotate).toBe(0);
  await page.keyboard.up("a");
  await expect.poll(() => inputs.at(-1)?.rotate).toBe(1);
  await page.keyboard.up("d");
  await expect.poll(() => inputs.at(-1)?.rotate).toBe(0);
  const thrust = page.getByRole("button", { name: "Thrust, hold W or up arrow" });
  const bounds = await thrust.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await expect.poll(() => inputs.at(-1)?.thrust).toBe(true);
  await page.mouse.move(10, 200);
  await page.mouse.up();
  await expect.poll(() => inputs.at(-1)?.thrust).toBe(false);
  if (testInfo.project.name === "phone") {
    const touch = await page.context().newCDPSession(page);
    const left = await page.getByRole("button", { name: "Rotate left, hold A or left arrow" }).boundingBox();
    expect(left).not.toBeNull();
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { id: 0, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
        { id: 1, x: left.x + left.width / 2, y: left.y + left.height / 2 },
      ],
    });
    await expect.poll(() => inputs.at(-1)?.thrust).toBe(true);
    await expect.poll(() => inputs.at(-1)?.rotate).toBe(-1);
    await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expect.poll(() => inputs.at(-1)?.thrust).toBe(false);
    await expect.poll(() => inputs.at(-1)?.rotate).toBe(0);
    await touch.detach();
  }
  await page.keyboard.down("w");
  await expect.poll(() => inputs.at(-1)?.thrust).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(() => inputs.at(-1)?.thrust).toBe(false);
  await page.keyboard.up("w");
  await page.getByRole("button", { name: "Hangar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.down("w");
  await page.keyboard.up("w");
  await expect.poll(() => inputs.at(-1)?.thrust).toBe(false);
  await page.getByRole("button", { name: "Stay in flight" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Hangar", exact: true }).click();
  await page.getByRole("button", { name: "Return to hangar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Launch mission", exact: true })).toBeEnabled();
  await expect(page.locator("#main-content")).toBeFocused();
  expect(errors).toEqual([]);
});

test("a real training flight produces a report and unlocks the next frontier", async ({ page }) => {
  test.setTimeout(45_000);
  await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
  await page.getByRole("button", { name: "Launch mission", exact: true }).click();
  await expect(page.getByText("FLIGHT LINK ACTIVE", { exact: true })).toBeVisible();
  await page.keyboard.down("w");
  try {
    await expect(page).toHaveURL(/\/debrief$/, { timeout: 25_000 });
  } finally {
    await page.keyboard.up("w");
  }
  await expect(page.getByRole("heading", { name: "One step further." })).toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator(".flight-recorder")).toContainText("keyframes");
  await page.getByRole("link", { name: "Find your next frontier" }).click();
  await expect(page.getByRole("link", { name: "Low Earth Insertion: view briefing", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Low Earth Insertion: view briefing", exact: true })).toBeVisible();
});

test("unlocks refresh after early debrief navigation even when the flight report fails", async ({ page }) => {
  test.setTimeout(45_000);
  const catalogRequested = deferred();
  const releaseCatalog = deferred();
  let catalogRequests = 0;
  await page.route("**/api/v1/missions", async (route) => {
    catalogRequests += 1;
    if (catalogRequests > 1) {
      catalogRequested.release();
      await releaseCatalog.promise;
    }
    await route.continue();
  });
  await page.route("**/api/v1/runs/*/result", (route) => route.fulfill({ status: 503, json: { detail: "Flight recorder is unavailable." } }));
  try {
    await openFlightDeck(page, "/missions/tutorial-first-ignition/hangar");
    await page.getByRole("button", { name: "Launch mission", exact: true }).click();
    await expect(page.getByText("FLIGHT LINK ACTIVE", { exact: true })).toBeVisible();
    await page.keyboard.down("w");
    await expect(page).toHaveURL(/\/debrief$/, { timeout: 25_000 });
    await page.keyboard.up("w");
    await expect(page.getByRole("alert")).toContainText("Flight recorder is unavailable.");
    await catalogRequested.promise;
    await page.getByRole("link", { name: "Find your next frontier" }).click();
    await expect(page.getByRole("article", { name: "Low Earth Insertion: locked", exact: true })).toBeVisible();
    releaseCatalog.release();
    await expect(page.getByRole("link", { name: "Low Earth Insertion: view briefing", exact: true })).toBeVisible();
  } finally {
    await page.keyboard.up("w");
    releaseCatalog.release();
  }
});

test("account forms have labels, native validation, and a clear server error", async ({ page }) => {
  await openFlightDeck(page, "/settings");
  await expect(page.getByRole("textbox", { name: "Commander name (optional)" })).toBeVisible();
  await page.getByRole("textbox", { name: "Email address" }).fill("not-an-email");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Begin your explorer story" }).click();
  expect(await page.getByRole("textbox", { name: "Email address" }).evaluate((input) => input.validity.valid)).toBe(false);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Commander name (optional)" })).toHaveCount(0);
  await page.route("**/api/v1/auth/login", (route) => route.fulfill({ status: 401, json: { detail: "Incorrect email or password." } }));
  await page.getByRole("textbox", { name: "Email address" }).fill("explorer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("an-invalid-test-password");
  await page.getByRole("button", { name: "Return to mission control" }).click();
  await expect(page.getByRole("alert")).toContainText("Incorrect email or password.");
  await expect(page.getByRole("button", { name: "Return to mission control" })).toBeEnabled();
});

test("a commander can register, sign out, and sign back in", async ({ page }) => {
  const email = `orbital-ui-${crypto.randomUUID()}@example.com`;
  const password = `test-only-${crypto.randomUUID()}`;
  await openFlightDeck(page, "/settings");
  await page.getByRole("textbox", { name: "Commander name (optional)" }).fill("Test Explorer");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Begin your explorer story" }).click();
  await expect(page.getByText("REGISTERED EXPLORER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Test Explorer", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out of your account" }).click();
  await expect(page.getByText("GUEST EXPLORER", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Return to mission control" }).click();
  await expect(page.getByText("REGISTERED EXPLORER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Test Explorer", exact: true })).toBeVisible();
});

test("crafting and empty debrief never imply unearned upgrades or a failed flight", async ({ page }) => {
  await openFlightDeck(page, "/crafting");
  await expect(page.locator(".recipe-card")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Not yet available" })).toHaveCount(3);
  for (const button of await page.getByRole("button", { name: "Not yet available" }).all()) await expect(button).toBeDisabled();
  await page.goto("/missions/tutorial-first-ignition/debrief");
  await expect(page.getByRole("heading", { name: "Your flight story is still unwritten." })).toBeVisible();
  await expect(page.getByText("Mission Failed", { exact: true })).toHaveCount(0);
});

test("screens fit the viewport, keep semantic headings, and honor reduced motion", async ({ page }) => {
  for (const path of ["/", "/missions", "/missions/tutorial-first-ignition/briefing", "/missions/tutorial-first-ignition/hangar", "/crafting", "/settings", "/guide"]) {
    await openFlightDeck(page, path);
    await expect(page.locator(".loading-orbit")).toHaveCount(0);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      unlabeledFields: Array.from(document.querySelectorAll("input")).filter((input) => !input.labels?.length && !input.getAttribute("aria-label")).length,
    }));
    expect(layout.content, path).toBeLessThanOrEqual(layout.viewport);
    expect(layout.unlabeledFields, path).toBe(0);
  }
  await page.goto("/");
  await expect(page.locator(".orbit-craft")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".page")).toHaveCSS("animation-name", "none");
});
