import { chromium } from "playwright";
const url = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1350, height: 940 },
  bypassCSP: true,
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__shifts.push({
        value: e.value,
        sources: (e.sources || []).map((s) => ({
          node: s.node ? s.node.tagName + "." + (s.node.className || "") : "?",
          prev: s.previousRect,
          cur: s.currentRect,
        })),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
});
await page.goto(url + "?cb=" + Date.now(), { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const shifts = await page.evaluate(() => window.__shifts);
let total = 0;
for (const s of shifts) {
  total += s.value;
  console.log("shift", s.value.toFixed(4));
  for (const src of s.sources)
    console.log(
      "   ",
      src.node,
      "y:",
      src.prev?.y,
      "->",
      src.cur?.y,
      "h:",
      src.prev?.height,
      "->",
      src.cur?.height
    );
}
console.log("TOTAL CLS:", total.toFixed(4));
await browser.close();
