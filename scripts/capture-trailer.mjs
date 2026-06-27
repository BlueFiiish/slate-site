// Screenshot the laptop trailer at evenly-spaced scroll positions so the
// choreographed beats can be reviewed, plus the static (no-JS) and
// reduced-motion settled states.
import { chromium } from "playwright";

const BASE = process.env.CAP_BASE || "http://localhost:4326/slate-site/";
const OUT = ".captures/trailer";
const EXEC =
  process.env.USERPROFILE +
  "\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe";

const browser = await chromium.launch({ executablePath: EXEC });

// ---------------------------------------------------------------------------
// 1) SCRUBBED trailer (JS on, motion allowed). The pin spans end:"+=360%" of
//    a 900px viewport. Walk the pinned region and shoot evenly-spaced beats.
// ---------------------------------------------------------------------------
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts && document.fonts.ready);
await page.waitForTimeout(800);

const span = await page.evaluate(() => {
  const el = document.querySelector("#showcase");
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY };
});

const vh = 900;
const pinDistance = vh * 3.6; // matches end: "+=360%"

async function shootAt(progress, name) {
  const target = span.top + progress * pinDistance;
  await page.evaluate((t) => window.scrollTo(0, t), target);
  await page.waitForTimeout(750); // let scrub + crossfades settle
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name, "@progress", progress);
}

// Sample points land ON settled beats (not mid-transition).
await shootAt(0.05, "01-open-hero");
await shootAt(0.24, "02-service01-custom");
await shootAt(0.41, "03-service02-astro");
await shootAt(0.57, "04-service03-phone");
await shootAt(0.74, "05-service04-google");
await shootAt(0.86, "06-service05-real");
await shootAt(0.92, "07-service06-oneperson");
await shootAt(0.995, "08-closing-wordmark");
await ctx.close();

// ---------------------------------------------------------------------------
// 2) STATIC fallback (JS DISABLED). Laptop + all six services legible.
// ---------------------------------------------------------------------------
const ctxNoJs = await browser.newContext({
  viewport: { width: 1440, height: 1400 },
  deviceScaleFactor: 2,
  javaScriptEnabled: false,
});
const pNo = await ctxNoJs.newPage();
await pNo.goto(BASE, { waitUntil: "load" });
const elNo = await pNo.$("#showcase");
await elNo.scrollIntoViewIfNeeded();
await pNo.waitForTimeout(500);
await elNo.screenshot({ path: `${OUT}/09-static-nojs.png` });
await ctxNoJs.close();

// ---------------------------------------------------------------------------
// 3) REDUCED MOTION (JS on, motion reduced -> settled end-state, no scrub).
// ---------------------------------------------------------------------------
const ctxRm = await browser.newContext({
  viewport: { width: 1440, height: 1400 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const pRm = await ctxRm.newPage();
await pRm.goto(BASE, { waitUntil: "networkidle" });
const elRm = await pRm.$("#showcase");
await elRm.scrollIntoViewIfNeeded();
await pRm.waitForTimeout(600);
await elRm.screenshot({ path: `${OUT}/10-reduced-motion.png` });
await ctxRm.close();

// ---------------------------------------------------------------------------
// 4) MOBILE static (390w) — laptop + service grid stack + legible.
// ---------------------------------------------------------------------------
const ctxMob = await browser.newContext({
  viewport: { width: 390, height: 1600 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const pMob = await ctxMob.newPage();
await pMob.goto(BASE, { waitUntil: "networkidle" });
const elMob = await pMob.$("#showcase");
await elMob.scrollIntoViewIfNeeded();
await pMob.waitForTimeout(500);
await elMob.screenshot({ path: `${OUT}/11-mobile.png` });
await ctxMob.close();

await browser.close();
console.log("CAPTURED");
