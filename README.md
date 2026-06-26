# Slate — studio site

The marketing site for **Slate**, an independent web studio (domain: slateandco.com).
Built in Astro, static output, near-zero JS. This is the studio's own credibility
piece; the flagship portfolio item is the Ana's Confections rebuild
(https://bluefiiish.github.io/).

## Develop

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static output -> dist/
npm run preview   # serve the built dist/
```

## Structure

- `src/styles/tokens.css` — the design system (type, spacing, color, radius,
  shadow, motion). Single source of truth; nothing off-scale.
- `src/styles/global.css` — reset, base type, shared primitives, the motion
  system (visible-by-default reveals: native scroll-timeline + IO fallback).
- `src/layouts/Base.astro` — head, preloads, OG, JSON-LD (ProfessionalService +
  Person), skip-link, the feature-detect + IO-fallback scripts.
- `src/components/` — the 12 sections (Nav, Hero, Problem, WhatIDo,
  FreeRedesign, WorkBento, Process, About, Trust, Pricing, ClosingCTA, Footer)
  plus MobileCTA, DeviceMockup, and the CompareSlider island.
- `src/pages/index.astro` — composes the page.
- `src/assets/captures/` — Ana before/after screenshots (the "before" is the
  original template site; the "after" is the live Slate rebuild).
- `scripts/capture.mjs` — regenerates the Ana captures via Playwright @2x DPR.
  `scripts/verify*.mjs` — local QA captures + checks (scratch).

## The one island

`CompareSlider.astro` is the only interactive component. Its `<script>` is a
small module Astro inlines; it initializes on scroll-into-view (IntersectionObserver),
supports pointer drag, click-to-position, touch, and keyboard (a real range
input). With no JS it degrades to a centered 50/50 split (and a CSS scroll-wipe
where scroll-timeline is supported). The `--pos` custom property is registered
via `@property` so it animates smoothly.

## Motion

Three gated layers, all behind `prefers-reduced-motion: no-preference`, all
visible-by-default:
1. Native CSS scroll-driven reveals (`animation-timeline: view()/scroll()`).
2. A ~1KB IntersectionObserver fallback, used only on
   `html.no-scroll-timeline` (set by a feature-detect in the head).
3. Reduced-motion users get static, fully-visible content.

## Deploy

Static `dist/` deploys to any host (Cloudflare Pages / GitHub Pages / etc.).
Set the real domain in `astro.config.mjs` (`SITE`) before deploy — it drives
canonical URLs, the sitemap, and absolute OG image URLs.

## Notes / TODO

- Fonts are self-hosted (`@fontsource-variable/*`), latin subset, swap; the two
  above-the-fold faces are preloaded from `public/fonts/`.
- Second portfolio cell ("Your business here") is an honest placeholder — drop
  in the next real rebuild when it exists.
- Replace the placeholder email `hello@slateandco.com` with the real inbox.
