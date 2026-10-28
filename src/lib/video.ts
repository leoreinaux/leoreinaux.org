import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

/**
 * Vídeo do YouTube dos posts: miniatura, transcrição e duração.
 * A miniatura é baixada no build e servida pelo próprio site (astro:assets), para nenhuma página
 * falar com o YouTube antes de a pessoa clicar no play (ver a política de privacidade).
 */

/** Endereço base das miniaturas; YOUTUBE_MINIATURAS troca o servidor (só para testes locais). */
const BASE_MINIATURAS = process.env.YOUTUBE_MINIATURAS ?? 'https://i.ytimg.com/vi';

const miniaturas = new Map<string, Promise<string | undefined>>();

/**
 * URL da maior miniatura disponível do vídeo, ou undefined se nenhuma puder ser baixada
 * (ID errado ou build sem acesso à rede). O build segue, com um fundo neutro no lugar.
 */
export function miniaturaDoVideo(youtubeId: string): Promise<string | undefined> {
  let busca = miniaturas.get(youtubeId);
  if (!busca) {
    busca = (async () => {
      // maxresdefault (1280×720) não existe em todo vídeo; hqdefault (480×360) sempre existe.
      for (const tamanho of ['maxresdefault', 'sddefault', 'hqdefault']) {
        const url = `${BASE_MINIATURAS}/${youtubeId}/${tamanho}.jpg`;
        try {
          const resposta = await fetch(url, { method: 'HEAD' });
          if (resposta.ok) return url;
        } catch {
          break;
        }
      }
      console.warn(`[video] Miniatura do vídeo ${youtubeId} indisponível; o post usa um fundo neutro.`);
      return undefined;
    })();
    miniaturas.set(youtubeId, busca);
  }
  return busca;
}

interface Transcricao {
  Content: AstroComponentFactory;
  rawContent(): string;
}

const transcricoes = import.meta.glob<Transcricao>('/src/content/posts/*/transcricao.md', { eager: true });

/** Transcrição do vídeo (transcricao.md na pasta do post), se existir. */
export function transcricaoDoPost(slug: string): { Content: AstroComponentFactory; texto: string } | undefined {
  const modulo = transcricoes[`/src/content/posts/${slug}/transcricao.md`];
  return modulo && { Content: modulo.Content, texto: modulo.rawContent().trim() };
}

/** "PT2M10S" → "2 min 10 s". */
export function duracaoLegivel(iso: string): string {
  const [, h, m, s] = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/) ?? [];
  return [h && `${h} h`, m && `${m} min`, s && `${s} s`].filter(Boolean).join(' ') || iso;
}
