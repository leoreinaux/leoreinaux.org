import type { APIRoute } from 'astro';
import { site } from '../../site.config';

/** Arquivo que prova aos buscadores que a chave do IndexNow é deste site (ver scripts/indexnow.ts). */
export const GET: APIRoute = () =>
  new Response(site.indexNowKey, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
