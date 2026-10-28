import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { render } from 'astro:content';
import { site } from '../../site.config';
import { getPublishedPosts, postUrl } from '../lib/posts';

/** Troca links e imagens relativos à raiz (/...) por URLs absolutas, que todo leitor de RSS entende. */
function absolutizeUrls(html: string): string {
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${site.url}/`);
}

/** Feed RSS completo: cada item traz o texto inteiro do post. */
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  // Renderiza o componente do post, e não post.rendered.html, para que as imagens do texto
  // passem pelo astro:assets e virem <img> de verdade.
  const container = await AstroContainer.create();
  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      return {
        title: post.data.title,
        link: postUrl(post),
        pubDate: post.data.pubDate,
        description: post.data.summary,
        content: absolutizeUrls(await container.renderToString(Content)),
        customData: `<dc:creator>${site.author.name}</dc:creator>`,
        categories: post.data.tags,
      };
    }),
  );
  return rss({
    title: site.name,
    description: site.description,
    site: site.url,
    trailingSlash: false,
    // dc:creator leva só o nome; o <author> do RSS 2.0 exigiria um e-mail.
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    customData: `<language>${site.lang}</language>`,
    items,
  });
};
