import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { site } from '../../site.config';
import { audioDoPost } from '../lib/audio';
import { getPublishedPosts, postUrl } from '../lib/posts';

/**
 * Feed de podcast: um episódio por post com áudio (audio.mp3 na pasta do post, gerado por npm run audio).
 * Os tutoriais ficam de fora, porque código e passo a passo funcionam pior em áudio.
 * Tags do Apple Podcasts (itunes:), que o Spotify e os demais apps também leem.
 * Referência: https://podcasters.apple.com/support/823-podcast-requirements
 */

const abs = (caminho: string) => new URL(caminho, site.url).href;

const xml = (texto: string) => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "PT14M3S" → 843 (segundos), o formato mais aceito de itunes:duration. */
function segundos(iso: string): number {
  const [, h = '0', m = '0', s = '0'] = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/) ?? [];
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

export const GET: APIRoute = async () => {
  const episodios = (await getPublishedPosts()).flatMap((post) => {
    const audio = audioDoPost(post);
    return audio ? [{ post, audio }] : [];
  });
  const capa = abs('/podcast.png');
  const { podcast } = site;

  return rss({
    title: site.name,
    description: podcast.descricao,
    site: site.url,
    trailingSlash: false,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      itunes: 'http://www.itunes.com/dtds/podcast-1.0.dtd',
    },
    customData: [
      `<atom:link href="${abs('/podcast.xml')}" rel="self" type="application/rss+xml"/>`,
      `<language>${site.lang}</language>`,
      `<copyright>${xml(`${site.author.name}, ${site.contentLicense.name}`)}</copyright>`,
      `<image><url>${capa}</url><title>${xml(site.name)}</title><link>${site.url}</link></image>`,
      `<itunes:author>${xml(site.author.name)}</itunes:author>`,
      `<itunes:owner><itunes:name>${xml(site.author.name)}</itunes:name><itunes:email>${xml(podcast.email)}</itunes:email></itunes:owner>`,
      `<itunes:image href="${capa}"/>`,
      `<itunes:category text="${xml(podcast.categoria)}"/>`,
      '<itunes:explicit>false</itunes:explicit>',
      '<itunes:type>episodic</itunes:type>',
    ].join(''),
    items: episodios.map(({ post, audio }) => ({
      title: post.data.title,
      // O link do post também é o guid do episódio: não muda quando o áudio é gerado de novo.
      link: postUrl(post),
      pubDate: post.data.pubDate,
      description: `${post.data.summary}\n\nTexto completo, com as fontes: ${abs(postUrl(post))}`,
      enclosure: { url: abs(audio.url), length: audio.bytes, type: 'audio/mpeg' },
      customData: [
        `<itunes:duration>${segundos(audio.duracao)}</itunes:duration>`,
        '<itunes:explicit>false</itunes:explicit>',
        '<itunes:episodeType>full</itunes:episodeType>',
      ].join(''),
    })),
  });
};
