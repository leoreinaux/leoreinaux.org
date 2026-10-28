import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { site } from '../../site.config';

/** Gera a imagem em WebP (até 1360px de largura) e devolve a URL absoluta, que funciona fora do site. */
export async function imageUrl(src: ImageMetadata): Promise<string> {
  const image = await getImage({ src, format: 'webp', width: Math.min(src.width, 1360) });
  return new URL(image.src, site.url).href;
}
