import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

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

/** Palavras por minuto de uma leitura atenta em português, na tela. */
const PALAVRAS_POR_MINUTO = 200;

/** Número de palavras do texto do post, sem contar os endereços dos links nem a marcação do Markdown. */
export function contarPalavras(post: Post): number {
  const texto = (post.body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/https?:\/\/\S+/g, ' ');
  return texto.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/** Tempo de leitura estimado, em minutos inteiros (no mínimo 1). */
export function tempoDeLeitura(post: Post): number {
  return Math.max(1, Math.ceil(contarPalavras(post) / PALAVRAS_POR_MINUTO));
}
