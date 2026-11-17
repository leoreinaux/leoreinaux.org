import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
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

/** Capa do podcast: quadrada, entre 1400 e 3000 px, como pedem o Apple Podcasts e o Spotify. */
export const CAPA_DO_PODCAST = 1400;

/** Capa do podcast em PNG: o nome do autor em destaque, legível mesmo pequena na lista dos apps. */
export async function renderCapaDoPodcast(): Promise<Buffer> {
  const lado = CAPA_DO_PODCAST;
  const capa = el(
    'div',
    {
      boxSizing: 'border-box',
      width: lado,
      height: lado,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '140px 120px 120px',
      backgroundColor: colors.bg,
      borderTop: `40px solid ${colors.accent}`,
      fontFamily: 'Source Sans 3',
    },
    [
      el('div', { display: 'flex', flexDirection: 'column' }, [
        el('div', { display: 'flex', fontSize: 64, fontWeight: 700, color: colors.accent, letterSpacing: 4 }, 'TEXTOS EM ÁUDIO'),
        el('div', { display: 'flex', marginTop: 40, fontSize: 200, fontWeight: 700, lineHeight: 1, color: colors.text }, site.author.name),
      ]),
      el('div', { display: 'flex', fontSize: 72, fontWeight: 700, color: colors.muted }, new URL(site.url).host),
    ],
  );
  const svg = await satori(capa as Parameters<typeof satori>[0], { width: lado, height: lado, fonts: await fonts });
  const imagem = new Resvg(svg).render();
  return pngSemTransparencia(imagem.pixels, imagem.width, imagem.height);
}

/**
 * PNG em RGB, sem o canal de transparência que o resvg sempre grava: o Apple Podcasts pede capa em RGB.
 * A capa não tem nada transparente, então o canal alfa é só descartado.
 */
function pngSemTransparencia(rgba: Buffer, largura: number, altura: number): Buffer {
  const linhas = Buffer.alloc(altura * (1 + largura * 3));
  for (let y = 0; y < altura; y++) {
    const inicio = y * (1 + largura * 3);
    // Cada linha começa com o byte do filtro (0, nenhum).
    for (let x = 0; x < largura; x++) rgba.copy(linhas, inicio + 1 + x * 3, (y * largura + x) * 4, (y * largura + x) * 4 + 3);
  }
  const bloco = (tipo: string, dados: Buffer) => {
    const tamanho = Buffer.alloc(4);
    tamanho.writeUInt32BE(dados.length);
    const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
    const verificacao = Buffer.alloc(4);
    verificacao.writeUInt32BE(crc32(corpo));
    return Buffer.concat([tamanho, corpo, verificacao]);
  };
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  // 8 bits por canal, tipo de cor 2 (RGB), compressão, filtro e entrelaçamento padrão.
  cabecalho.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', cabecalho),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

/** Resposta HTTP com o PNG do card. */
export async function ogResponse(title: string): Promise<Response> {
  return new Response(new Uint8Array(await renderOgImage(title)), { headers: { 'Content-Type': 'image/png' } });
}
