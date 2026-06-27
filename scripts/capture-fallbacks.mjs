// Verify the STATIC (no-JS) and prefers-reduced-motion fallbacks render a
// realistic settled device + legible features.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../.captures/realistic');
const PORT = process.env.PORT || '4326';
const URL = `http://localhost:${PORT}/slate-site/`;
const EXEC =
  process.env.USERPROFILE +
  '\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

const browser = await chromium.launch({ executablePath: EXEC });

// --- 1. NO-JS static fallback ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
    javaScriptEnabled: false,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(500);
  const sec = await page.$('#showcase');
  await sec.screenshot({ path: resolve(out, '06-nojs-static.png') });
  console.log('saved 06-nojs-static.png');
  await ctx.close();
}

// --- 2. prefers-reduced-motion ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => {
    const s = document.querySelector('#showcase');
    if (s) s.scrollIntoView();
  });
  await page.waitForTimeout(1200);
  const sec = await page.$('#showcase');
  await sec.screenshot({ path: resolve(out, '07-reduced-motion.png') });
  console.log('saved 07-reduced-motion.png');
  await ctx.close();
}

await browser.close();
console.log('done');
