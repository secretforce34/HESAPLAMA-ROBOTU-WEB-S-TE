// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Alan adı alınınca burayı güncelle (src/site.config.ts ile aynı olmalı).
const SITE_URL = 'https://hesaprobotu.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [preact(), sitemap()],
  prefetch: { defaultStrategy: 'hover' },
});
