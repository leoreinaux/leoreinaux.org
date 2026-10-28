import type { APIRoute } from 'astro';
import { site } from '../../site.config';
import { ogResponse } from '../lib/og';

/** Card social padrão, usado pelas páginas que não são posts. */
export const GET: APIRoute = () => ogResponse(site.description);
