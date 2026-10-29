import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type Transcricao = CollectionEntry<'transcricoes'>;

/**
 * Posts visíveis, do mais novo para o mais antigo.
 * Rascunhos (draft: true) aparecem em `astro dev` e ficam fora do build de produção.
 * INCLUIR_RASCUNHOS=1 os inclui no build, só para o workflow de qualidade testar a página de post.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const incluirRascunhos = !import.meta.env.PROD || process.env.INCLUIR_RASCUNHOS === '1';
  const posts = await getCollection('posts', ({ data }) => incluirRascunhos || data.draft !== true);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function postUrl(post: Post): string {
  return `/posts/${post.id}`;
}

export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

/** Transcrição do vídeo do post (transcricao.md na pasta dele), se o post tiver vídeo e transcrição. */
export async function getTranscricao(post: Post): Promise<Transcricao | undefined> {
  return post.data.video ? getEntry('transcricoes', post.id) : undefined;
}

/** Texto puro da transcrição, sem a marcação do Markdown, para os dados estruturados. */
export function transcricaoTexto(transcricao: Transcricao): string {
  return (transcricao.body ?? '')
    .replace(/^#+\s+/gm, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Duração ISO 8601 (PT1H2M10S) por extenso e curta: "1 h 2 min 10 s". */
export function formatDuration(iso: string): string {
  const [, h, m, s] = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso) ?? [];
  const partes = [h && `${Number(h)} h`, m && `${Number(m)} min`, s && `${Math.round(Number(s))} s`].filter(Boolean);
  return partes.join(' ') || iso;
}
