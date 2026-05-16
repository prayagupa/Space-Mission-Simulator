#!/usr/bin/env node
/**
 * Capture README screenshots. Requires the app running (Docker or npm run dev):
 *   http://127.0.0.1:5290
 * Then: npm run screenshot
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "docs", "screenshots");
const base = process.env.SCREENSHOT_BASE || "http://127.0.0.1:5290";

fs.mkdirSync(dir, { recursive: true });

const shots = [
  { url: `${base}/`, file: "main-menu.png" },
  { url: `${base}/missions`, file: "galaxy-map.png" },
];

for (const { url, file } of shots) {
  const out = path.join(dir, file);
  execSync(
    `npx --yes playwright screenshot --viewport-size=1280,800 --wait-for-timeout=4000 "${url}" "${out}"`,
    { stdio: "inherit", cwd: root },
  );
  console.log(`Wrote ${out}`);
}
