// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Yayın adresi derleme sırasında SITE_URL ortam değişkeninden gelir (bkz. .github/workflows/yayinla.yml).
// Site, alan adının kökünde çalışacak şekilde yazıldı: kendi alan adı ya da kullaniciadi.github.io deposu.
const SITE_URL = process.env.SITE_URL || 'https://hesaprobotu.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [preact(), sitemap()],
  prefetch: { defaultStrategy: 'hover' },
});
