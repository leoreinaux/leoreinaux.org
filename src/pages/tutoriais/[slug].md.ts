import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedTutoriais, type Post } from '../../lib/posts';
import { postToMarkdown, textResponse } from '../../lib/markdown';

/** Cada tutorial também em Markdown puro, em /tutoriais/<slug>.md. */
export const getStaticPaths = (async () => {
  const posts = await getPublishedTutoriais();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: Post }> = async ({ props }) =>
  textResponse(await postToMarkdown(props.post), 'text/markdown');
