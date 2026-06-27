import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".captures", "demo");
mkdirSync(OUT, { recursive: true });
const url = process.argv[2] || "http://localhost:4324/slate-site/";
const browser = await chromium.launch();

// 1) STATIC / NO-JS
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    javaScriptEnabled: false,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.locator("#showcase").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator("#showcase").screenshot({
    path: join(OUT, "STATE-static-nojs.png"),
  });
  console.log("saved static-nojs");
  await ctx.close();
}

// 2) REDUCED MOTION
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("#showcase").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.locator("#showcase").screenshot({
    path: join(OUT, "STATE-reduced-motion.png"),
  });
  console.log("saved reduced-motion");
  await ctx.close();
}

await browser.close();
console.log("DONE");
