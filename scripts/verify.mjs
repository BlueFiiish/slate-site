import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../.verify');
const URL = process.env.VERIFY_URL || 'http://localhost:4399/';
const EXEC = process.env.USERPROFILE +
  '\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC });

async function run(name, width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Check for horizontal overflow
  const overflow = await page.evaluate(() => {
    return {
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    };
  });

  await page.screenshot({ path: resolve(out, `${name}-top.png`) });
  // Scroll to free-redesign and capture
  await page.evaluate(() => {
    const el = document.querySelector('#free-redesign');
    if (el) el.scrollIntoView();
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(out, `${name}-redesign.png`) });

  // Scroll to work
  await page.evaluate(() => {
    document.querySelector('#work')?.scrollIntoView();
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(out, `${name}-work.png`) });

  // process + pricing
  await page.evaluate(() => {
    document.querySelector('#pricing')?.scrollIntoView();
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(out, `${name}-pricing.png`) });

  // closing
  await page.evaluate(() => {
    document.querySelector('#contact')?.scrollIntoView();
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(out, `${name}-closing.png`) });

  console.log(`[${name}] ${width}x${height}`);
  console.log('  overflow:', overflow.scrollW > overflow.clientW + 1
    ? `YES (scroll ${overflow.scrollW} > client ${overflow.clientW})`
    : 'none');
  console.log('  console errors:', errors.length ? errors : 'none');
  await ctx.close();
}

async function testSlider(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('#free-redesign')?.scrollIntoView());
  await page.waitForTimeout(1000);
  const ready = await page.evaluate(() =>
    document.querySelector('[data-compare]')?.hasAttribute('data-ready')
  );
  // keyboard test: focus range, press arrow keys
  await page.focus('[data-range]');
  const before = await page.evaluate(() =>
    getComputedStyle(document.querySelector('[data-compare]')).getPropertyValue('--pos')
  );
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() =>
    getComputedStyle(document.querySelector('[data-compare]')).getPropertyValue('--pos')
  );
  console.log(`[slider ${width}px] island ready:`, ready, '| --pos before/after key:', before.trim(), '->', after.trim());
  await ctx.close();
}

await run('mobile', 375, 812);
await run('desktop', 1280, 900);
await testSlider(1280);

await browser.close();
console.log('done');
