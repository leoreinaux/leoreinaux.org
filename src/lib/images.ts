import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { site } from '../../site.config';

/** Imagens de src/assets/, indexadas pelo nome do arquivo (por exemplo, a foto do autor). */
const assets = import.meta.glob<ImageMetadata>('/src/assets/*.{jpg,jpeg,png,webp,avif}', { eager: true, import: 'default' });

/** Foto do autor definida no site.config.ts; o build quebra se o arquivo não existir. */
export function authorPhoto(): { src: ImageMetadata; alt: string } | undefined {
  const photo = site.author.photo;
  if (!photo) return undefined;
  const src = assets[`/src/assets/${photo.src}`];
  if (!src) throw new Error(`Foto do autor não encontrada: src/assets/${photo.src}`);
  return { src, alt: photo.alt };
}

/**
 * Gera a imagem (WebP por padrão, até 1360px de largura) e devolve a URL absoluta, que funciona fora do site.
 * Para e-mail, use JPEG: nem todo programa de e-mail mostra WebP.
 */
export async function imageUrl(src: ImageMetadata, format: 'webp' | 'jpeg' = 'webp', maxWidth = 1360): Promise<string> {
  const image = await getImage({ src, format, width: Math.min(src.width, maxWidth) });
  return new URL(image.src, site.url).href;
}
