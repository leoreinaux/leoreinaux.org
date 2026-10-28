import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts, type Post } from '../../lib/posts';
import { postToMarkdown, textResponse } from '../../lib/markdown';

/** Cada post também em Markdown puro, em /posts/<slug>.md. */
export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: Post }> = async ({ props }) =>
  textResponse(await postToMarkdown(props.post), 'text/markdown');
