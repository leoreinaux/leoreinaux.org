import type { APIRoute } from 'astro';
import { site } from '../../site.config';
import { imageUrl } from '../lib/images';
import { getPublishedPosts, postUrl } from '../lib/posts';

/**
 * Posts publicados com newsletter: true, para o scripts/newsletter.ts montar as campanhas depois do deploy.
 * Só traz o que já é público em cada post e no RSS.
 */
export const GET: APIRoute = async () => {
  const posts = (await getPublishedPosts()).filter((post) => post.data.newsletter);
  const itens = await Promise.all(
    posts.map(async (post) => ({
      slug: post.id,
      title: post.data.title,
      summary: post.data.summary,
      url: new URL(postUrl(post), site.url).href,
      pubDate: post.data.pubDate.toISOString().slice(0, 10),
      cover: { url: await imageUrl(post.data.cover.src, 'jpeg', 1200), alt: post.data.cover.alt },
    })),
  );
  return new Response(JSON.stringify(itens, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
