import type { APIRoute } from 'astro';
import { renderCapaDoPodcast } from '../lib/og';

/** Capa do podcast (/podcast.xml), quadrada, em 1400×1400. */
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderCapaDoPodcast()), { headers: { 'Content-Type': 'image/png' } });
