import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import pagefindIndex from './src/integrations/pagefind';
import cspScriptsInline from './src/integrations/csp';
import { site } from './site.config';
import { satteri } from '@astrojs/markdown-satteri';
import { linksExternos } from './src/lib/links';

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
  integrations: [
    // Gera sitemap-index.xml e sitemap-0.xml no build; a 404 e a busca ficam de fora.
    sitemap({
      filter: (page) => !/\/(404|busca)$/.test(page),
    }),
    cspScriptsInline(),
    pagefindIndex(),
  ],
  // Links externos dos posts abrem em nova aba (src/lib/links.ts).
  markdown: {
    processor: satteri({ hastPlugins: [linksExternos] }),
  },
  // Content-Security-Policy numa <meta> de cada página, com o hash de cada script e estilo inline
  // (os scripts is:inline entram pela integração src/integrations/csp.ts).
  // O que a <meta> não aceita (frame-ancestors) e os demais cabeçalhos ficam em public/_headers.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        // Umami: o script vem da VPS e envia as visitas para ela.
        `connect-src 'self' ${site.analytics.umamiUrl}`,
        // Player do VideoEmbed, só depois do clique.
        'frame-src https://www.youtube-nocookie.com',
        // Formulário de inscrição, enviado direto ao Listmonk.
        `form-action 'self' ${site.newsletter.listmonkUrl}`,
        "base-uri 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        // 'wasm-unsafe-eval': o Pagefind roda a busca em WebAssembly.
        resources: ["'self'", site.analytics.umamiUrl, "'wasm-unsafe-eval'"],
      },
      styleDirective: {
        // Atributos style só no realce de código (Shiki); <style> e folhas seguem por hash.
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
    },
  },
  // Miniaturas dos vídeos: baixadas do YouTube no build e servidas pelo site (src/lib/video.ts).
  image: {
    domains: ['i.ytimg.com'],
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
