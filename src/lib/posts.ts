import { getCollection, type CollectionEntry } from 'astro:content';

/** Coleções de textos publicados no site; cada uma tem a própria URL (/posts/<slug>, /tutoriais/<slug>). */
export type Colecao = 'posts' | 'tutoriais';

/** Um texto de qualquer coleção: post ou tutorial. */
export type Post = CollectionEntry<Colecao>;

const maisNovoPrimeiro = (a: Post, b: Post) => b.data.pubDate.getTime() - a.data.pubDate.getTime();

/**
 * Textos visíveis de uma coleção, do mais novo para o mais antigo.
 * Rascunhos (draft: true) aparecem em `astro dev` e ficam fora do build de produção.
 * INCLUIR_RASCUNHOS=1 os inclui no build, só para o workflow de qualidade testar a página de post.
 */
async function publicados<C extends Colecao>(colecao: C): Promise<CollectionEntry<C>[]> {
  const incluirRascunhos = !import.meta.env.PROD || process.env.INCLUIR_RASCUNHOS === '1';
  const textos: CollectionEntry<C>[] = await getCollection(colecao, ({ data }: Post) => incluirRascunhos || data.draft !== true);
  return textos.sort(maisNovoPrimeiro);
}

/** Posts publicados (a lista "Textos" da home e a newsletter). */
export const getPublishedPosts = () => publicados('posts');

/** Tutoriais publicados (a página /tutoriais). */
export const getPublishedTutoriais = () => publicados('tutoriais');

/** Posts e tutoriais juntos, do mais novo para o mais antigo: feed RSS, llms-full.txt. */
export async function getPublishedTextos(): Promise<Post[]> {
  const [posts, tutoriais] = await Promise.all([getPublishedPosts(), getPublishedTutoriais()]);
  return [...posts, ...tutoriais].sort(maisNovoPrimeiro);
}

export function postUrl(post: Post): string {
  return `/${post.collection}/${post.id}`;
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
