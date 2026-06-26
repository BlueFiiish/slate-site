import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../.verify');
const URL = 'http://localhost:4399/';
const EXEC = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXEC });

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });

// Land each target a bit above so reveals settle fully visible.
async function settle(sel, name) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo(0, y);
    }
  }, sel);
  await page.waitForTimeout(900);
  // nudge to trigger any final reveal
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(out, name) });
}

await settle('.problem', 'desktop-problem.png');
await settle('.whatido', 'desktop-whatido.png');
await settle('.process', 'desktop-process.png');
await settle('.about', 'desktop-about.png');
await settle('.trust', 'desktop-trust.png');

// reduced motion check: all reveal content visible
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const p2 = await ctx2.newPage();
await p2.goto(URL, { waitUntil: 'networkidle' });
const hidden = await p2.evaluate(() => {
  const els = Array.from(document.querySelectorAll('.reveal'));
  return els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length;
});
console.log('reduced-motion: reveal elements with opacity<0.99:', hidden, '/ total', await p2.evaluate(()=>document.querySelectorAll('.reveal').length));
await p2.screenshot({ path: resolve(out, 'reduced-motion-top.png') });

await browser.close();
console.log('done');
