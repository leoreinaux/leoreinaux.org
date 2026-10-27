import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Cada post é uma pasta em src/content/posts/<slug>/ com um index.md.
 * O nome da pasta vira o slug e a URL: /posts/<slug>.
 * Um campo obrigatório ausente ou inválido quebra o build.
 * Regras completas na tabela de frontmatter de docs/arquitetura.md.
 */
const posts = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './src/content/posts',
    generateId: ({ entry }) => entry.split('/')[0]!,
  }),
  schema: ({ image }) =>
    z.strictObject({
      title: z.string().min(1),
      description: z.string().min(1).max(160),
      summary: z.string().min(1),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      cover: z.strictObject({
        src: image(),
        alt: z.string().trim().min(1, 'cover.alt é obrigatório e não pode ficar vazio'),
      }),
      tags: z.array(z.string().min(1)).optional(),
      video: z
        .strictObject({
          youtubeId: z.string().regex(/^[\w-]{11}$/, 'youtubeId deve ter 11 caracteres'),
          /** Duração em ISO 8601, por exemplo PT2M10S. */
          duration: z.iso.duration(),
          uploadDate: z.coerce.date(),
        })
        .optional(),
      newsletter: z.boolean(),
      draft: z.boolean().optional(),
      /** Reservado para a fase 2: trecho por rede, por exemplo { linkedin: '...' }. */
      social: z.record(z.string(), z.string()).optional(),
    }),
});

export const collections = { posts };
