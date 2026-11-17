import type { APIRoute } from 'astro';
import { audioDoPost } from '../lib/audio';
import { getPublishedTextos } from '../lib/posts';

/**
 * Tamanho em bytes de cada MP3 publicado, pelo caminho no site. O worker/index.ts lê esta lista para
 * responder aos pedidos de trecho (Range): a resposta dos static assets chega a ele sem o Content-Length.
 */
export const GET: APIRoute = async () => {
  const tamanhos: Record<string, number> = {};
  for (const post of await getPublishedTextos()) {
    const audio = audioDoPost(post);
    if (audio) tamanhos[audio.url] = audio.bytes;
  }
  return new Response(JSON.stringify(tamanhos), { headers: { 'Content-Type': 'application/json' } });
};
