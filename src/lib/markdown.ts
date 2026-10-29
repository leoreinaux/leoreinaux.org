import type { ImageMetadata } from 'astro';
import { site } from '../../site.config';
import { imageUrl } from './images';
import { formatDate, formatDuration, getTranscricao, postUrl, type Post } from './posts';

/** Imagens que ficam nas pastas dos posts, indexadas pelo caminho a partir da raiz do projeto. */
const postImages = import.meta.glob<ImageMetadata>('/src/content/posts/*/**/*.{jpg,jpeg,png,webp,avif,gif}', {
  eager: true,
  import: 'default',
});

/** Troca imagens com caminho relativo (./foto.jpg) pela URL da imagem processada. */
async function resolveImages(markdown: string, post: Post): Promise<string> {
  const refs = [...markdown.matchAll(/!\[([^\]]*)\]\(\.\/([^)\s]+)\)/g)];
  let result = markdown;
  for (const [match, alt = '', path = ''] of refs) {
    const src = postImages[`/src/content/posts/${post.id}/${path}`];
    if (src) result = result.replace(match, `![${alt}](${await imageUrl(src)})`);
  }
  return result;
}

/** Troca links relativos à raiz (/sobre) por URLs absolutas. */
function absolutizeLinks(markdown: string): string {
  return markdown.replace(/\]\(\/(?!\/)/g, `](${site.url}/`);
}

/** Link para o vídeo e, se houver, a transcrição, no fim da versão em Markdown. */
async function videoSection(post: Post): Promise<string | undefined> {
  const { video } = post.data;
  if (!video) return undefined;
  const transcricao = await getTranscricao(post);
  const link = `Vídeo de ${formatDuration(video.duration)}: https://www.youtube.com/watch?v=${video.youtubeId}`;
  return ['## Transcrição do vídeo', link, transcricao?.body?.trim()].filter(Boolean).join('\n\n');
}

/**
 * Versão em Markdown puro de um post, para leitura por modelos de linguagem:
 * título, autoria, datas, licença, resumo, capa, o texto original e a transcrição do vídeo.
 */
export async function postToMarkdown(post: Post): Promise<string> {
  const { title, summary, pubDate, updatedDate, cover } = post.data;
  const datas = [`Publicado em ${formatDate(pubDate, site.locale)}`];
  if (updatedDate) datas.push(`atualizado em ${formatDate(updatedDate, site.locale)}`);
  const body = absolutizeLinks(await resolveImages(post.body ?? '', post));
  const video = await videoSection(post);

  return [
    `# ${title}`,
    [
      `- Autor: ${site.author.name}, ${site.author.jobTitle}`,
      `- ${datas.join(', ')}`,
      `- Original: ${new URL(postUrl(post), site.url).href}`,
      `- Licença: [${site.contentLicense.name}](${site.contentLicense.url}), pode ser reproduzido com crédito`,
    ].join('\n'),
    `> **Resumo:** ${summary}`,
    `![${cover.alt}](${await imageUrl(cover.src)})`,
    body.trim(),
    ...(video ? [video] : []),
  ].join('\n\n') + '\n';
}

/** Resposta HTTP com texto em UTF-8. */
export function textResponse(body: string, type: 'text/markdown' | 'text/plain'): Response {
  return new Response(body, { headers: { 'Content-Type': `${type}; charset=utf-8` } });
}
