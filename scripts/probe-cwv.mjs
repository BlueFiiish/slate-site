import { chromium } from "playwright";

const BASE = process.env.CAP_BASE || "http://localhost:4322/slate-site/";
const browser = await chromium.launch();

// ---- 1) CLS + LCP on initial load WITHOUT scrolling into the showcase
//        (GSAP must NOT load; layout must not shift). ----
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const jsBytes = { total: 0, gsap: 0, files: [] };
page.on("response", async (res) => {
  const url = res.url();
  if (url.endsWith(".js") || url.includes(".js?")) {
    try {
      const buf = await res.body();
      jsBytes.total += buf.length;
      if (/gsap|ScrollTrigger/i.test(url)) jsBytes.gsap += buf.length;
      jsBytes.files.push({ url: url.split("/").pop().slice(0, 40), kb: (buf.length / 1024).toFixed(1) });
    } catch {}
  }
});

await page.addInitScript(() => {
  window.__cls = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (!e.hadRecentInput) window.__cls += e.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => {
    const es = l.getEntries();
    window.__lcp = es[es.length - 1].startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const beforeScroll = await page.evaluate(() => ({
  cls: window.__cls,
  lcp: window.__lcp,
  gsapLoaded: !!window.gsap,
}));
const jsAtLoad = jsBytes.total;

// ---- 2) Now scroll through the whole showcase track (this triggers GSAP load
//        + the full pinned scrub). Re-measure CLS — must stay ~0. ----
const geo = await page.evaluate(() => {
  const t = document.querySelector("[data-showcase-track]");
  return { top: t.getBoundingClientRect().top + window.scrollY, height: t.offsetHeight, vh: window.innerHeight };
});
const travel = geo.height - geo.vh;
for (let p = 0; p <= 1.0001; p += 0.05) {
  await page.evaluate((t) => window.scrollTo(0, t), geo.top + p * travel);
  await page.waitForTimeout(120);
}
// scroll past to the footer and back to top (route-leave-ish stress)
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);

const after = await page.evaluate(() => ({ cls: window.__cls, gsapLoaded: !!window.gsap }));

console.log("=== JS BUDGET ===");
console.log("JS at initial load (KB):", (jsAtLoad / 1024).toFixed(1));
console.log("GSAP+ScrollTrigger (KB):", (jsBytes.gsap / 1024).toFixed(1), "(deferred; loads on intersection)");
console.log("Total JS after full scroll (KB):", (jsBytes.total / 1024).toFixed(1));
console.log("GSAP loaded before scrolling into showcase?", beforeScroll.gsapLoaded, "(should be false)");
console.log("GSAP loaded after scroll?", after.gsapLoaded, "(should be true)");
console.log("files:", JSON.stringify(jsBytes.files));
console.log("=== CWV ===");
console.log("LCP (ms):", beforeScroll.lcp?.toFixed(0));
console.log("CLS at load:", beforeScroll.cls.toFixed(5));
console.log("CLS after full showcase scrub + return:", after.cls.toFixed(5));

await browser.close();
