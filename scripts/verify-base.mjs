// Loads the preview at the /slate-site/ base, at 375px and 1280px, and reports
// console errors + any failed (non-200) network requests. Screenshots to .verify/
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../.verify');
const URL = process.env.VERIFY_URL || 'http://localhost:4321/slate-site/';

const EXEC = process.env.USERPROFILE +
  '\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

const browser = await chromium.launch({ executablePath: EXEC });

async function run(label, width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  const failed = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', (r) =>
    failed.push(`${r.url()} :: ${r.failure()?.errorText}`)
  );
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(async () => {
    await (document.fonts ? document.fonts.ready : Promise.resolve());
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);

  // Did the hero image actually load (naturalWidth > 0)?
  const imgStats = await page.evaluate(() => {
    const imgs = Array.from(document.images);
    const broken = imgs
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.currentSrc || i.src);
    return { total: imgs.length, broken };
  });

  // Did a custom font apply (not the fallback)?
  const fontFamily = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? getComputedStyle(h1).fontFamily : '(no h1)';
  });

  await page.screenshot({ path: resolve(out, `base-${label}.png`), fullPage: false });
  await ctx.close();

  console.log(`\n=== ${label} (${width}x${height}) ===`);
  console.log('images:', imgStats.total, 'broken:', imgStats.broken.length, imgStats.broken);
  console.log('h1 font-family:', fontFamily);
  console.log('console errors:', errors.length, errors);
  console.log('failed/4xx requests:', failed.length, failed);
}

await run('mobile', 375, 812);
await run('desktop', 1280, 900);
await browser.close();
console.log('\nDONE');
