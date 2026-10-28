import { defineConfig, fontProviders } from 'astro/config';
import { site } from './site.config';

// Subconjunto latino: cobre todo o português (inclui ã, õ, ç e acentos).
const latin = [
  'U+0000-00FF',
  'U+0131',
  'U+0152-0153',
  'U+02BB-02BC',
  'U+02C6',
  'U+02DA',
  'U+02DC',
  'U+0304',
  'U+0308',
  'U+0329',
  'U+2000-206F',
  'U+20AC',
  'U+2122',
  'U+2191',
  'U+2193',
  'U+2212',
  'U+2215',
  'U+FEFF',
  'U+FFFD',
] as [string, ...string[]];

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: site.url,
  output: 'static',
  // URLs sem barra no fim (/posts/slug), servidas a partir de arquivos .html.
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  // Fontes OFL servidas pelo próprio site (ver src/assets/fonts/README.md).
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Literata',
      cssVariable: '--font-body',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/literata/literata-latin-wght-normal.woff2'],
            weight: '200 900',
            style: 'normal',
            display: 'swap',
            unicodeRange: latin,
          },
          {
            src: ['./src/assets/fonts/literata/literata-latin-wght-italic.woff2'],
            weight: '200 900',
            style: 'italic',
            display: 'swap',
            unicodeRange: latin,
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Source Sans 3',
      cssVariable: '--font-heading',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/source-sans-3/source-sans-3-latin-wght-normal.woff2'],
            weight: '200 900',
            style: 'normal',
            display: 'swap',
            unicodeRange: latin,
          },
          {
            src: ['./src/assets/fonts/source-sans-3/source-sans-3-latin-wght-italic.woff2'],
            weight: '200 900',
            style: 'italic',
            display: 'swap',
            unicodeRange: latin,
          },
        ],
      },
    },
  ],
});
