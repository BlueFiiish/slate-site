import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const dir = ".lighthouseci";
const files = readdirSync(dir)
  .filter((f) => f.startsWith("lhr-") && f.endsWith(".json"))
  .map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);
if (!files.length) {
  console.log("no lhr file");
  process.exit(0);
}
const j = JSON.parse(readFileSync(join(dir, files[0].f)));
const a = j.audits;
console.log("PERF  ", j.categories.performance.score);
console.log("FCP   ", a["first-contentful-paint"].numericValue.toFixed(0) + "ms");
console.log("LCP   ", a["largest-contentful-paint"].numericValue.toFixed(0) + "ms");
console.log("TBT   ", a["total-blocking-time"].numericValue.toFixed(0) + "ms");
console.log("CLS   ", a["cumulative-layout-shift"].numericValue.toFixed(4));
console.log("SI    ", a["speed-index"].numericValue.toFixed(0) + "ms");
console.log("A11Y  ", j.categories.accessibility.score);
console.log("BP    ", j.categories["best-practices"].score);
console.log("SEO   ", j.categories.seo.score);
