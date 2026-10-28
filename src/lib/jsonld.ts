import { getImage } from 'astro:assets';
import { site } from '../../site.config';
import { authorPhoto, imageUrl } from './images';
import { postUrl, type Post } from './posts';
import { miniaturaDoVideo, transcricaoDoPost } from './video';

/**
 * Dados estruturados (schema.org) em JSON-LD.
 * Os nós têm @id fixo para que posts e páginas apontem para o mesmo autor e o mesmo site.
 */

const abs = (path: string) => new URL(path, site.url).href;
const ids = {
  person: abs('/sobre#autor'),
  website: abs('/#site'),
};
/** Data no formato AAAA-MM-DD, como no frontmatter. */
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export type JsonLdNode = Record<string, unknown>;

export async function personNode(): Promise<JsonLdNode> {
  const photo = authorPhoto();
  return {
    '@type': 'Person',
    '@id': ids.person,
    name: site.author.name,
    jobTitle: site.author.jobTitle,
    description: site.author.bio,
    url: abs('/sobre'),
    sameAs: site.social.map(({ url }) => url),
    ...(photo ? { image: await imageUrl(photo.src) } : {}),
  };
}

export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    name: site.name,
    url: abs('/'),
    description: site.description,
    inLanguage: site.lang,
    author: { '@id': ids.person },
    publisher: { '@id': ids.person },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${abs('/busca')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Página Sobre: um ProfilePage cuja entidade principal é o autor. */
export async function profilePageNodes(): Promise<JsonLdNode[]> {
  return [
    { '@type': 'ProfilePage', url: abs('/sobre'), inLanguage: site.lang, mainEntity: { '@id': ids.person }, isPartOf: { '@id': ids.website } },
    await personNode(),
    websiteNode(),
  ];
}

/** Vídeo do post: o mesmo do player, com a transcrição em texto, que buscadores e IAs conseguem ler. */
async function videoNode(post: Post, url: string): Promise<JsonLdNode | undefined> {
  const { video, title, summary, cover } = post.data;
  if (!video) return undefined;
  const remota = await miniaturaDoVideo(video.youtubeId);
  // Sem a miniatura do YouTube, a capa do post faz o papel: o Google exige uma miniatura.
  const miniatura = remota
    ? abs((await getImage({ src: remota, inferSize: true, width: 1280, format: 'webp' })).src)
    : await imageUrl(cover.src, 'jpeg', 1280);
  const transcricao = transcricaoDoPost(post.id);
  return {
    '@type': 'VideoObject',
    '@id': `${url}#video`,
    name: title,
    description: summary,
    thumbnailUrl: miniatura,
    uploadDate: isoDate(video.uploadDate),
    duration: video.duration,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
    url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    inLanguage: site.lang,
    ...(transcricao ? { transcript: transcricao.texto } : {}),
  };
}

export async function postNodes(post: Post, ogImage: string): Promise<JsonLdNode[]> {
  const { title, summary, pubDate, updatedDate, cover, tags } = post.data;
  const url = abs(postUrl(post));
  const video = await videoNode(post, url);
  return [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#post`,
      headline: title,
      description: summary,
      url,
      mainEntityOfPage: url,
      datePublished: isoDate(pubDate),
      dateModified: isoDate(updatedDate ?? pubDate),
      inLanguage: site.lang,
      image: [await imageUrl(cover.src), ogImage],
      author: { '@id': ids.person },
      publisher: { '@id': ids.person },
      isPartOf: { '@id': ids.website },
      license: site.contentLicense.url,
      ...(tags && tags.length > 0 ? { keywords: tags } : {}),
      ...(video ? { video: { '@id': video['@id'] } } : {}),
    },
    ...(video ? [video] : []),
    {
      // Ainda não existe uma página que liste os posts, então o caminho é Início › post.
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: title, item: url },
      ],
    },
    await personNode(),
    websiteNode(),
  ];
}

/** Serializa para um <script type="application/ld+json">, sem deixar o texto fechar a tag. */
export function serializeJsonLd(nodes: JsonLdNode[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
