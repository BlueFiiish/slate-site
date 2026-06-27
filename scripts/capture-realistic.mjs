// Capture the realistic device at key beats of the scroll-scrubbed demo.
// Reads the preview server (BASE /slate-site/). Drives the #showcase track
// scroll to specific progress points and screenshots the device.
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
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts && document.fonts.ready);

// Wait for the island to hydrate (#showcase gets .is-live once GSAP builds).
// IntersectionObserver loads it when near view, so scroll it into range first.
await page.evaluate(() => {
  const s = document.querySelector('#showcase');
  if (s) s.scrollIntoView();
});
await page.waitForSelector('#showcase.is-live', { timeout: 20000 }).catch(() => {
  console.warn('is-live not detected (reduced-motion or no JS?) — capturing static');
});
await page.waitForTimeout(800);

// The track is #showcase .showcase__track (660vh). Scroll progress p in [0,1]
// maps linearly across the track's scrollable range. We compute the absolute
// scrollY for a given p and settle (scrub: 0.7 needs a beat to catch up).
async function atProgress(p) {
  await page.evaluate((p) => {
    const track = document.querySelector('#showcase .showcase__track');
    if (!track) return;
    const rectTop = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.offsetHeight - window.innerHeight;
    window.scrollTo(0, Math.round(rectTop + travel * p));
  }, p);
  // let the scrubbed timeline settle
  await page.waitForTimeout(700);
}

async function shotDevice(name, p) {
  await atProgress(p);
  const el = await page.$('#showcase .showcase__device');
  if (!el) throw new Error('device not found');
  await el.screenshot({ path: resolve(out, name) });
  console.log('saved', name, 'at p=', p);
}

// Full pinned-stage shot — shows the metal frame, base, glow + shadow in
// context (the tight device-element crop hides the laptop body + grounding).
async function shotStage(name, p) {
  await atProgress(p);
  const el = await page.$('#showcase .showcase__pin');
  if (!el) throw new Error('pin not found');
  await el.screenshot({ path: resolve(out, name) });
  console.log('saved', name, 'at p=', p);
}

// report the live rotateY at a progress point (to confirm a real spin frame)
async function rotAt(p) {
  await atProgress(p);
  return page.evaluate(() => {
    const b = document.querySelector('#showcase [data-bezel]');
    return b ? getComputedStyle(b).getPropertyValue('--spin') : 'n/a';
  });
}

// Beat map (from the timeline in LaptopShowcase.astro):
//  0.08-0.18 = open laptop settled        -> p ~0.13
//  0.20-0.24 = Y-flip spin mid-frame      -> p ~0.215 (rotateY ~ -45..-90)
//  0.36-0.50 = laptop->phone morph        -> mid at p ~0.43
//  ~0.49     = full phone, notch in       -> p ~0.50
// Probe progress points across the flip to find a strong rotateY frame.
let bestP = 0.23;
let bestAbs = 0;
for (const p of [0.232, 0.236, 0.24, 0.245, 0.25, 0.255, 0.26, 0.27]) {
  const v = parseFloat((await rotAt(p)).trim()) || 0;
  console.log('spin probe p=', p, '--spin=', v.toFixed(1));
  if (Math.abs(v) > bestAbs) { bestAbs = Math.abs(v); bestP = p; }
}
console.log('strongest spin at p=', bestP, '(|--spin|=', bestAbs.toFixed(1), ')');

await shotStage('01-open-laptop.png', 0.135);
await shotStage('02-spin-midframe.png', bestP);
await shotStage('03-morph-mid.png', 0.42);
await shotStage('04-full-phone.png', 0.50);
// tight device crops too (close-up of the materials)
await shotDevice('01b-open-laptop-close.png', 0.135);
await shotDevice('04b-full-phone-close.png', 0.50);

await browser.close();
console.log('done');
