import { site } from '../../site.config';
import { imageUrl } from './images';
import { postUrl, type Post } from './posts';

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

export function personNode(): JsonLdNode {
  return {
    '@type': 'Person',
    '@id': ids.person,
    name: site.author.name,
    jobTitle: site.author.jobTitle,
    description: site.author.bio,
    url: abs('/sobre'),
    sameAs: site.social.map(({ url }) => url),
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
  };
}

/** Página Sobre: um ProfilePage cuja entidade principal é o autor. */
export function profilePageNodes(): JsonLdNode[] {
  return [
    { '@type': 'ProfilePage', url: abs('/sobre'), inLanguage: site.lang, mainEntity: { '@id': ids.person }, isPartOf: { '@id': ids.website } },
    personNode(),
    websiteNode(),
  ];
}

export async function postNodes(post: Post, ogImage: string): Promise<JsonLdNode[]> {
  const { title, summary, pubDate, updatedDate, cover, tags } = post.data;
  const url = abs(postUrl(post));
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
    },
    {
      // Ainda não existe uma página que liste os posts, então o caminho é Início › post.
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: title, item: url },
      ],
    },
    personNode(),
    websiteNode(),
  ];
}

/** Serializa para um <script type="application/ld+json">, sem deixar o texto fechar a tag. */
export function serializeJsonLd(nodes: JsonLdNode[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
