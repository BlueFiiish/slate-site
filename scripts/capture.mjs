// Capture clean 2x-DPR screenshots of the live Ana rebuild for device mockups
// and the before/after centerpiece.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../src/assets/captures');
const LIVE = 'https://bluefiiish.github.io/';

const EXEC = process.env.USERPROFILE +
  '\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

const browser = await chromium.launch({ executablePath: EXEC });

async function prep(page) {
  await page.goto(LIVE, { waitUntil: 'load', timeout: 60000 });
  // Force every lazy image to load by scrolling through, then return to top.
  await page.evaluate(async () => {
    await (document.fonts ? document.fonts.ready : Promise.resolve());
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
    // Eager-load any remaining lazy imgs
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => {
      i.loading = 'eager';
    });
  });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
}

async function shot(name, { width, height, dpr, fullPage = false }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
  });
  const page = await ctx.newPage();
  await prep(page);
  const opts = { path: resolve(out, name), animations: 'disabled' };
  if (fullPage) opts.fullPage = true;
  await page.screenshot(opts);
  console.log('saved', name);
  await ctx.close();
}

// Desktop viewport (top-of-page) for the MacBook mockup
await shot('ana-desktop-top.png', { width: 1440, height: 900, dpr: 2 });
// Desktop full page for the "after" half of the before/after
await shot('ana-desktop-full.png', { width: 1440, height: 1700, dpr: 2, fullPage: true });
// Mobile viewport (top-of-page) for the iPhone mockup
await shot('ana-mobile-top.png', { width: 390, height: 844, dpr: 3 });

await browser.close();
console.log('done');
