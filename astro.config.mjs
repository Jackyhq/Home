import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import { isEnglish, localeSite } from './src/i18n/config.ts';

export default defineConfig({
  site: localeSite.url,
  outDir: isEnglish ? './dist-en' : './dist',
  output: 'static',
  compressHTML: true,
  integrations: [
    icon({
      include: {
        ph: ['arrow-down', 'arrow-right', 'arrow-up-right'],
      },
    }),
    sitemap(),
  ],
  vite: {
    server: {
      host: '0.0.0.0',
      allowedHosts: ['terminal.local'],
    },
  },
});
