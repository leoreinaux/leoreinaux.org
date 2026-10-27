import { defineConfig } from 'astro/config';
import { site } from './site.config';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: site.url,
  output: 'static',
  // URLs sem barra no fim (/posts/slug), servidas a partir de arquivos .html.
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
