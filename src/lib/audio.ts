import { site } from '../../site.config';
import { narracaoDoTexto, type InfoDoAudio } from './narracao';
import type { Post } from './posts';

/**
 * Versão em áudio dos posts e tutoriais: audio.mp3 e audio.json na pasta do texto, gerados por
 * `npm run audio` (scripts/audio.ts). O MP3 é servido pelo próprio site, com hash no nome.
 */

const arquivos = import.meta.glob<string>('/src/content/{posts,tutoriais}/*/audio.mp3', { eager: true, query: '?url', import: 'default' });
const infos = import.meta.glob<InfoDoAudio>('/src/content/{posts,tutoriais}/*/audio.json', { eager: true, import: 'default' });

export interface AudioDoPost {
  /** Caminho do MP3 no site (/_astro/audio.<hash>.mp3). */
  url: string;
  /** Duração em ISO 8601 (PT14M3S). */
  duracao: string;
  bytes: number;
  /** Gravação do autor, não voz sintética. */
  gravacao: boolean;
}

const conferidos = new Set<string>();

/** Áudio do post, se houver. Avisa no build quando o texto mudou depois que o áudio foi gerado. */
export function audioDoPost(post: Post): AudioDoPost | undefined {
  const pasta = `/src/content/${post.collection}/${post.id}`;
  const url = arquivos[`${pasta}/audio.mp3`];
  const info = infos[`${pasta}/audio.json`];
  if (!url || !info) return undefined;

  if (!info.gravacao && !conferidos.has(pasta)) {
    conferidos.add(pasta);
    const { hash } = narracaoDoTexto({ title: post.data.title, summary: post.data.summary, corpo: post.body ?? '' }, site);
    if (hash !== info.texto) {
      console.warn(`[audio] O texto de ${post.collection}/${post.id} mudou depois que o áudio foi gerado. Rode npm run audio e faça o commit.`);
    }
  }
  return { url, duracao: info.duracao, bytes: info.bytes, gravacao: info.gravacao === true };
}

/** 2689204 → "2,6 MB". */
export function tamanhoLegivel(bytes: number): string {
  return `${new Intl.NumberFormat(site.locale, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;
}
