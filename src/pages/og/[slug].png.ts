import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts, type Post } from '../../lib/posts';
import { ogResponse } from '../../lib/og';

/** Card social de cada post, em /og/<slug>.png. */
export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: Post }> = ({ props }) => ogResponse(props.post.data.title);
