import { chromium } from "playwright";

const BASE = process.env.CAP_BASE || "http://localhost:4326/slate-site/";
const OUT = ".captures/laptop";

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// 1) ANIMATED keyframes (JS on, motion allowed). Drive the pinned scrub by
//    scrolling through the section and shooting start / mid / end.
// ---------------------------------------------------------------------------
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

// Locate the pin host so we can compute its scroll span.
const span = await page.evaluate(() => {
  const el = document.querySelector("#showcase");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: el.offsetHeight };
});
if (!span) {
  console.log("SHOWCASE_NOT_FOUND");
  await browser.close();
  process.exit(1);
}

// The ScrollTrigger end is "+=180%" of viewport, pinned. Walk the pin region.
async function shootAt(progress, name) {
  // progress 0..1 across the pinned scroll distance.
  const y = await page.evaluate(({ top }) => {
    // start pin when section top hits viewport top
    return top;
  }, span);
  const vh = 900;
  const pinDistance = vh * 1.8; // matches end: "+=180%"
  const target = span.top + progress * pinDistance;
  await page.evaluate((t) => window.scrollTo(0, t), target);
  // let scrub + cross-fade settle
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

await shootAt(0.02, "01-start");
await shootAt(0.5, "02-mid");
await shootAt(0.95, "03-end");

// Full-viewport context shot at mid for the record.
await ctx.close();

// ---------------------------------------------------------------------------
// 2) STATIC fallback (JS DISABLED). Section must be complete + legible.
// ---------------------------------------------------------------------------
const ctxNoJs = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  deviceScaleFactor: 2,
  javaScriptEnabled: false,
});
const pNo = await ctxNoJs.newPage();
await pNo.goto(BASE, { waitUntil: "load" });
const elNo = await pNo.$("#showcase");
await elNo.scrollIntoViewIfNeeded();
await pNo.waitForTimeout(400);
await elNo.screenshot({ path: `${OUT}/04-static-nojs.png` });
await ctxNoJs.close();

// ---------------------------------------------------------------------------
// 3) REDUCED MOTION (JS on, but motion reduced -> settled end-state, no scrub).
// ---------------------------------------------------------------------------
const ctxRm = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const pRm = await ctxRm.newPage();
await pRm.goto(BASE, { waitUntil: "networkidle" });
const elRm = await pRm.$("#showcase");
await elRm.scrollIntoViewIfNeeded();
await pRm.waitForTimeout(500);
await elRm.screenshot({ path: `${OUT}/05-reduced-motion.png` });
await ctxRm.close();

// ---------------------------------------------------------------------------
// 4) MOBILE static (390w) — both rails + laptop should stack and be legible.
// ---------------------------------------------------------------------------
const ctxMob = await browser.newContext({
  viewport: { width: 390, height: 1400 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
const pMob = await ctxMob.newPage();
await pMob.goto(BASE, { waitUntil: "networkidle" });
const elMob = await pMob.$("#showcase");
await elMob.scrollIntoViewIfNeeded();
await pMob.waitForTimeout(400);
await elMob.screenshot({ path: `${OUT}/06-mobile.png` });
await ctxMob.close();

await browser.close();
console.log("CAPTURED");
