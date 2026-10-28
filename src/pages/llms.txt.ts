import type { APIRoute } from 'astro';
import { site } from '../../site.config';
import { getPublishedPosts, postUrl } from '../lib/posts';
import { textResponse } from '../lib/markdown';

/**
 * Índice do site para modelos de linguagem, no formato de https://llmstxt.org.
 * Os links dos posts apontam para a versão em Markdown.
 */
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const url = (path: string) => new URL(path, site.url).href;
  const lista =
    posts.length > 0
      ? posts.map((post) => `- [${post.data.title}](${url(`${postUrl(post)}.md`)}): ${post.data.description}`).join('\n')
      : 'Ainda não há posts publicados.';

  const body = [
    `# ${site.name}`,
    `> ${site.description}`,
    [
      `Escrito por ${site.author.name}. ${site.author.bio}`,
      `Os textos estão sob a licença ${site.contentLicense.name} (${site.contentLicense.url}): podem ser citados e reproduzidos com crédito ao autor e link para o original.`,
    ].join(' '),
    `## Posts\n\n${lista}`,
    // "Optional" é o nome que o formato reserva para links que podem ser ignorados.
    [
      '## Optional',
      '',
      `- [Texto completo de todos os posts](${url('/llms-full.txt')}): os posts acima, inteiros, num só arquivo`,
      `- [Sobre](${url('/sobre')}): quem escreve e por que o site existe`,
      `- [Feed RSS](${url('/rss.xml')}): posts com o texto completo`,
    ].join('\n'),
  ];
  return textResponse(body.join('\n\n') + '\n', 'text/plain');
};
