// Throwaway capture script for the 3D laptop test page.
// Orbits via canvas drag to 4 poses, screenshots each.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".captures", "test3d");
const PORT = process.env.PORT || "4327";
const URL = `http://localhost:${PORT}/slate-site/test-3d/`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  // Disable auto-rotate so the orbit drags land on deterministic poses.
  reducedMotion: "reduce",
});
await page.goto(URL, { waitUntil: "networkidle" });
// let the texture + env load and a few frames settle
await page.waitForTimeout(2500);

const cx = 800; // canvas center x (viewport center)
const cy = 500;

// Drag helper: rotate the orbit camera by dragging across the canvas.
async function drag(dx, dy) {
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps);
  }
  await page.mouse.up();
  await page.waitForTimeout(900); // let damping settle + auto-rotate drift small
}

async function shot(name) {
  await page.screenshot({ path: join(OUT, name) });
  console.log("captured", name);
}

// Start pose = straight-on front (auto-rotate disabled via reducedMotion).
// 1) FRONT
await shot("01-front.png");

// 2) 3/4 LEFT — drag right swings the camera to view the laptop's left side
await drag(260, -20);
await shot("02-three-quarter-left.png");

// 3) 3/4 RIGHT — swing back across to the right, screen catching the key light
await drag(-520, 20);
await shot("03-three-quarter-right.png");

// 4) NEAR-SIDE PROFILE — a steep side angle (not fully edge-on)
await drag(-120, 55);
await shot("04-near-profile.png");

await browser.close();
console.log("done ->", OUT);
