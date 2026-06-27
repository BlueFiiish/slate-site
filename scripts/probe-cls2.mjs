import { chromium } from "playwright";
const BASE = process.env.CAP_BASE || "http://localhost:4322/slate-site/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let gsapFetchTime = null;
const t0 = Date.now();
page.on("response", (res) => {
  if (/ScrollTrigger|gsap/i.test(res.url())) gsapFetchTime = Date.now() - t0;
});

await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (!e.hadRecentInput) {
        window.__shifts.push({
          value: +e.value.toFixed(5),
          y: window.scrollY,
          sources: (e.sources || []).map((s) => s.node ? (s.node.className || s.node.tagName || "?").toString().slice(0, 50) : "?"),
        });
      }
    }
  }).observe({ type: "layout-shift", buffered: true });
});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
console.log("GSAP fetched at load? time(ms from nav):", gsapFetchTime);

const geo = await page.evaluate(() => {
  const t = document.querySelector("[data-showcase-track]");
  return { top: t.getBoundingClientRect().top + window.scrollY, height: t.offsetHeight, vh: window.innerHeight };
});
const travel = geo.height - geo.vh;
console.log("GSAP fetched after reaching showcase region...");
for (let p = -0.2; p <= 1.05; p += 0.05) {
  await page.evaluate((t) => window.scrollTo(0, t), geo.top + p * travel);
  await page.waitForTimeout(120);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

const shifts = await page.evaluate(() => window.__shifts);
const total = shifts.reduce((a, s) => a + s.value, 0);
console.log("TOTAL CLS:", total.toFixed(5));
console.log("Shift events (value>0.0005):");
for (const s of shifts.filter((x) => x.value > 0.0005)) console.log(JSON.stringify(s));
console.log("GSAP fetch time after scroll loop (ms):", gsapFetchTime);
await browser.close();
