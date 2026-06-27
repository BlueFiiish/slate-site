import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.CAP_BASE || "http://localhost:4321/slate-site/";
const OUT = ".captures/cyber";
mkdirSync(OUT, { recursive: true });

const VW = 1440;
const VH = 900;

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// 1) ANIMATED keyframes (JS on, motion allowed). The pinned scrub spans the
//    track's travel = trackHeight - viewport. Walk it at chosen progress
//    points (timeline 0..1), including the morph mid-transition + spin frames.
// ---------------------------------------------------------------------------
const ctx = await browser.newContext({
  viewport: { width: VW, height: VH },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

// Measure the track travel.
const geo = await page.evaluate(() => {
  const track = document.querySelector("[data-showcase-track]");
  if (!track) return null;
  const r = track.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    height: track.offsetHeight,
    vh: window.innerHeight,
  };
});
if (!geo) {
  console.log("TRACK_NOT_FOUND");
  await browser.close();
  process.exit(1);
}
const travel = geo.height - geo.vh;

async function shoot(progress, name) {
  const target = geo.top + progress * travel;
  await page.evaluate((t) => window.scrollTo(0, t), target);
  await page.waitForTimeout(650); // let scrub (0.7) settle
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

// timeline beats: open .04, custom .12, flip-into-loads ~.22, loads .28,
// morph MID ~.39, phone full ~.47, google flip ~.60, before/after ~.80, close .96
await shoot(0.04, "01-open");
await shoot(0.12, "02-custom-design");
await shoot(0.238, "03-flip-spin");
await shoot(0.28, "04-loads-fast");
await shoot(0.43, "05-morph-mid");
await shoot(0.51, "06-phone-full");
await shoot(0.72, "07-google-flip");
await shoot(0.83, "08-before-after");
await shoot(0.97, "09-closing");
await ctx.close();

// ---------------------------------------------------------------------------
// 2) STATIC fallback (JS DISABLED). Section complete + legible, no clip.
// ---------------------------------------------------------------------------
const ctxNoJs = await browser.newContext({
  viewport: { width: VW, height: 1300 },
  deviceScaleFactor: 2,
  javaScriptEnabled: false,
});
const pNo = await ctxNoJs.newPage();
await pNo.goto(BASE, { waitUntil: "load" });
const elNo = await pNo.$("#showcase");
await elNo.scrollIntoViewIfNeeded();
await pNo.waitForTimeout(400);
await elNo.screenshot({ path: `${OUT}/10-static-nojs.png` });
await ctxNoJs.close();

// ---------------------------------------------------------------------------
// 3) REDUCED MOTION (JS on, motion reduced -> settled end-state).
// ---------------------------------------------------------------------------
const ctxRm = await browser.newContext({
  viewport: { width: VW, height: 1300 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const pRm = await ctxRm.newPage();
await pRm.goto(BASE, { waitUntil: "networkidle" });
const elRm = await pRm.$("#showcase");
await elRm.scrollIntoViewIfNeeded();
await pRm.waitForTimeout(500);
await elRm.screenshot({ path: `${OUT}/11-reduced-motion.png` });
await ctxRm.close();

await browser.close();
console.log("CAPTURED");
