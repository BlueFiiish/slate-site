// Capture ~8 evenly-spaced scroll positions through the LaptopShowcase demo.
// Run AFTER `npm run preview` is up. Pass the base URL as argv[2].
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".captures", "demo");
mkdirSync(OUT, { recursive: true });

const url = process.argv[2] || "http://localhost:4323/slate-site/";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

await page.goto(url, { waitUntil: "networkidle" });

// Let the island hydrate + GSAP build (it loads on near-visible).
// Scroll the section into view first so the IntersectionObserver fires.
await page.evaluate(() => {
  const s = document.querySelector("#showcase");
  s?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(1200);
await page
  .waitForSelector("#showcase.is-live", { timeout: 8000 })
  .catch(() => console.log("WARN: is-live not detected; capturing anyway"));

// Find the pin's scroll range. The pinned section occupies
// [pinTop, pinTop + pinHeight - viewportHeight] of document scroll.
const range = await page.evaluate(() => {
  const pinHost = document.querySelector("[data-showcase-pin]");
  // ScrollTrigger wraps the pinned element in a `.pin-spacer` whose height
  // carries the full scrub distance. Measure THAT, not the inner host.
  const spacer = pinHost.parentElement; // .pin-spacer
  const top = spacer.getBoundingClientRect().top + window.scrollY;
  const height = spacer.offsetHeight;
  return { top, height, vh: window.innerHeight };
});

const start = range.top;
const end = range.top + range.height - range.vh;
const N = 8;
const labels = [
  "00-open",
  "01-custom-pan",
  "02-fast-load",
  "03a-phone-morph-mid",
  "03b-phone-full",
  "04-google-listing",
  "05-beforeafter-wipe",
  "06-closing-wordmark",
];
// Hand-tuned progress fractions to land on the meaningful frames,
// incl. the morph MID-transition and the wipe in motion.
const fractions = [0.03, 0.13, 0.26, 0.41, 0.46, 0.59, 0.78, 0.96];

for (let i = 0; i < N; i++) {
  const y = Math.round(start + (end - start) * fractions[i]);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  // allow scrub (0.7) to settle fully before the frame grab
  await page.waitForTimeout(1100);
  const file = join(OUT, `${labels[i]}.png`);
  // Capture the fixed viewport (the section is pinned, fills the screen).
  await page.screenshot({ path: file });
  console.log("saved", file, "@y=", y);
}

await browser.close();
console.log("DONE");
