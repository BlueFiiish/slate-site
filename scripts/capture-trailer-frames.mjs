// Capture extra distinct frames of the live Ana rebuild for the trailer beats.
// We want a few visually-DIFFERENT viewport-sized shots beyond the hero:
//  - a gallery / "what comes out of the shop" section
//  - a lower content section (about / visit)
//  - a fresh mobile shot mid-page
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "../src/assets/captures");
const LIVE = "https://bluefiiish.github.io/";

const EXEC =
  process.env.USERPROFILE +
  "\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe";

const browser = await chromium.launch({ executablePath: EXEC });

async function prep(page) {
  await page.goto(LIVE, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(async () => {
    await (document.fonts ? document.fonts.ready : Promise.resolve());
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => {
      i.loading = "eager";
    });
  });
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

// Shoot a viewport-sized frame at a given absolute scrollY.
async function shotAt(name, { width, height, dpr, y }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
  });
  const page = await ctx.newPage();
  await prep(page);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(out, name), animations: "disabled" });
  console.log("saved", name, "@y", y);
  await ctx.close();
}

// Probe page height + section offsets so we pick meaningful scroll stops.
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await prep(page);
  const info = await page.evaluate(() => {
    const secs = Array.from(
      document.querySelectorAll("section, [id]")
    ).slice(0, 40);
    return {
      height: document.body.scrollHeight,
      anchors: secs.map((s) => ({
        id: s.id || s.tagName,
        y: Math.round(s.getBoundingClientRect().top + window.scrollY),
        h: s.offsetHeight,
      })),
    };
  });
  console.log("PAGE HEIGHT", info.height);
  console.log(JSON.stringify(info.anchors, null, 1));
  await ctx.close();
}

// Desktop section frames (1440x900 @2x): one mid-page, one lower.
await shotAt("ana-desktop-gallery.png", { width: 1440, height: 900, dpr: 2, y: 1100 });
await shotAt("ana-desktop-lower.png", { width: 1440, height: 900, dpr: 2, y: 2300 });
// A fresh mobile frame mid-page (390x844 @3x)
await shotAt("ana-mobile-gallery.png", { width: 390, height: 844, dpr: 3, y: 900 });

await browser.close();
console.log("done");
