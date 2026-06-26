import { chromium } from 'playwright';

const base = 'http://localhost:4324';

async function waitUp(page, url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await page.goto(url, { timeout: 2000, waitUntil: 'domcontentloaded' });
      if (r && r.ok()) return true;
    } catch (e) { /* retry */ }
    await new Promise((res) => setTimeout(res, 1000));
  }
  return false;
}

const browser = await chromium.launch();

// Desktop, reduced motion so every section is visible in a full-page capture
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const pD = await ctxD.newPage();
if (!(await waitUp(pD, base))) { console.log('SERVER_NOT_UP'); await browser.close(); process.exit(1); }
await pD.goto(base, { waitUntil: 'networkidle' });
await pD.waitForTimeout(1500);
await pD.screenshot({ path: 'slate-hero.png' });
await pD.screenshot({ path: 'slate-desktop-full.png', fullPage: true });

// Mobile full page
const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const pM = await ctxM.newPage();
await pM.goto(base, { waitUntil: 'networkidle' });
await pM.waitForTimeout(1200);
await pM.screenshot({ path: 'slate-mobile-full.png', fullPage: true });

await browser.close();
console.log('CAPTURED');
