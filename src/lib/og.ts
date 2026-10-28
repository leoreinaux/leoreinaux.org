import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { site } from '../../site.config';

/** Tamanho recomendado para Open Graph e cards do LinkedIn, WhatsApp e X. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Cores do tema claro, copiadas de src/styles/tokens.css (o Satori não lê variáveis CSS). */
const colors = {
  bg: '#faf8f3',
  text: '#1c1b19',
  muted: '#4f4b44',
  accent: '#1d4f7d',
};

/**
 * Source Sans 3 em woff estático: o Satori não lê woff2 nem fontes variáveis.
 * Os arquivos vêm do mesmo pacote do Fontsource e só são usados no build.
 */
const fontDir = join(process.cwd(), 'src/assets/fonts/source-sans-3');
const fonts = Promise.all(
  ([400, 700] as const).map(async (weight) => ({
    name: 'Source Sans 3',
    weight,
    style: 'normal' as const,
    data: await readFile(join(fontDir, `source-sans-3-latin-${weight}-normal.woff`)),
  })),
);

/** Elemento no formato que o Satori espera, sem precisar de React. */
type Node = { type: string; props: { style: Record<string, unknown>; children: Node | Node[] | string } };
const el = (type: string, style: Record<string, unknown>, children: Node['props']['children']): Node => ({
  type,
  props: { style, children },
});

/** Card social em PNG: faixa de destaque, título grande e, no rodapé, autor e domínio. */
export async function renderOgImage(title: string): Promise<Buffer> {
  // Títulos longos ficam menores para caber em até quatro linhas.
  const fontSize = title.length > 70 ? 56 : title.length > 40 ? 68 : 80;
  const card = el(
    'div',
    {
      // O Satori soma o padding à largura se não for border-box.
      boxSizing: 'border-box',
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      backgroundColor: colors.bg,
      borderTop: `16px solid ${colors.accent}`,
      fontFamily: 'Source Sans 3',
    },
    [
      el('div', { display: 'flex', fontSize, fontWeight: 700, lineHeight: 1.15, color: colors.text }, title),
      el('div', { display: 'flex', justifyContent: 'space-between', fontSize: 32, color: colors.muted }, [
        el('div', { display: 'flex' }, site.author.name),
        el('div', { display: 'flex', color: colors.accent, fontWeight: 700 }, new URL(site.url).host),
      ]),
    ],
  );
  const svg = await satori(card as Parameters<typeof satori>[0], { width: OG_WIDTH, height: OG_HEIGHT, fonts: await fonts });
  return new Resvg(svg).render().asPng();
}

/** Resposta HTTP com o PNG do card. */
export async function ogResponse(title: string): Promise<Response> {
  return new Response(new Uint8Array(await renderOgImage(title)), { headers: { 'Content-Type': 'image/png' } });
}
