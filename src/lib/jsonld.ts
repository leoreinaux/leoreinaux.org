import { site } from '../../site.config';
import { authorPhoto, imageUrl } from './images';
import { postUrl, transcricaoTexto, type Post, type Transcricao } from './posts';

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

/** Vídeo do post: a miniatura é a capa, a mesma imagem que o player mostra antes do clique. */
async function videoNode(post: Post, transcricao?: Transcricao): Promise<JsonLdNode | undefined> {
  const { title, summary, cover, video } = post.data;
  if (!video) return undefined;
  return {
    '@type': 'VideoObject',
    '@id': `${abs(postUrl(post))}#video`,
    name: title,
    description: summary,
    thumbnailUrl: await imageUrl(cover.src),
    uploadDate: video.uploadDate.toISOString(),
    duration: video.duration,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
    url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    inLanguage: site.lang,
    ...(transcricao ? { transcript: transcricaoTexto(transcricao) } : {}),
  };
}

export async function postNodes(post: Post, ogImage: string, transcricao?: Transcricao): Promise<JsonLdNode[]> {
  const { title, summary, pubDate, updatedDate, cover, tags } = post.data;
  const url = abs(postUrl(post));
  const video = await videoNode(post, transcricao);
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
