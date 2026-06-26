// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages PROJECT site (preview URL so Josia can see it now).
// The real custom domain (slateandco.com) comes later — when it does, set
// SITE back to 'https://slateandco.com' and BASE to '/'.
const SITE = 'https://bluefiiish.github.io';
const BASE = '/slate-site/';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  integrations: [sitemap()],
  image: {
    responsiveStyles: true,
  },
});
