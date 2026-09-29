#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "docs", "screenshots");
const base = process.env.SCREENSHOT_BASE || "http://127.0.0.1:5290";
const shots = [
  { pathname: "/", file: "main-menu.png" },
  { pathname: "/missions", file: "galaxy-map.png" },
];

await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  for (const { pathname, file } of shots) {
    await page.goto(new URL(pathname, base).href);
    await page.getByText("SYSTEMS ONLINE", { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(dir, file);
    await page.screenshot({ path: out, fullPage: true, animations: "disabled" });
    console.log(`Wrote ${out}`);
  }
  await page.goto(new URL("/missions/tutorial-first-ignition/hangar", base).href);
  await page.getByRole("button", { name: "Launch mission", exact: true }).click();
  await page.getByText("FLIGHT LINK ACTIVE", { exact: true }).waitFor();
  await page.keyboard.down("w");
  try {
    await page.getByText("PROPULSION ACTIVE", { exact: true }).waitFor();
    await page.waitForFunction(() => Number(document.querySelector('[aria-label="Fuel remaining"]')?.getAttribute("aria-valuenow") ?? 100) <= 92);
    const out = path.join(dir, "flight.png");
    await page.screenshot({ path: out, fullPage: true, animations: "disabled" });
    console.log(`Wrote ${out}`);
  } finally {
    await page.keyboard.up("w");
    await page.getByRole("button", { name: "Hangar", exact: true }).click();
    await page.getByRole("button", { name: "Return to hangar", exact: true }).click();
  }
} finally {
  await browser.close();
}
