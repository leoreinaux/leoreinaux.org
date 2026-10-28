import type { APIRoute } from 'astro';
import { site } from '../../site.config';

/**
 * Todos os robôs podem ler o site inteiro, inclusive os de busca e os de treinamento de IA,
 * coerente com a licença CC BY dos textos. Os de IA aparecem pelo nome para deixar a escolha explícita.
 */
const searchBots = ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'];
const trainingBots = ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Applebot-Extended'];

const group = (comment: string, agents: string[]) =>
  [`# ${comment}`, ...agents.map((agent) => `User-agent: ${agent}`), 'Allow: /'].join('\n');

export const GET: APIRoute = () => {
  const body = [
    group('Todos os robôs', ['*']),
    group('Busca de IA', searchBots),
    group('Treinamento de IA', trainingBots),
    `Sitemap: ${new URL('/sitemap-index.xml', site.url).href}`,
  ];
  return new Response(body.join('\n\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
