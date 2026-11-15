import type { APIRoute } from 'astro';
import { site } from '../../site.config';
import { getPublishedTextos } from '../lib/posts';
import { postToMarkdown, textResponse } from '../lib/markdown';

/** Todos os posts e tutoriais em Markdown num só arquivo, do mais novo para o mais antigo. */
export const GET: APIRoute = async () => {
  const posts = await getPublishedTextos();
  const textos = await Promise.all(posts.map(postToMarkdown));
  const body = [`# ${site.name}\n\n> ${site.description}`, ...textos].join('\n\n---\n\n');
  return textResponse(body.trimEnd() + '\n', 'text/plain');
};
