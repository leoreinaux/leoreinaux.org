import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import * as pagefind from 'pagefind';

/**
 * Gera o índice da busca (dist/pagefind/) ao fim do astro build.
 * Só os arquivos dos posts entram; dentro deles, só o <article data-pagefind-body>.
 * Sem posts publicados não há índice, e a página /busca avisa que a busca não está disponível.
 */
export default function pagefindIndex(): AstroIntegration {
  return {
    name: 'pagefind-index',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const site = fileURLToPath(dir);
        try {
          const { errors, index } = await pagefind.createIndex();
          if (!index) throw new Error(errors.join('\n'));
          const indexed = await index.addDirectory({ path: site, glob: 'posts/*.html' });
          if (indexed.errors.length > 0) throw new Error(indexed.errors.join('\n'));
          if (indexed.page_count === 0) {
            logger.info('Nenhum post publicado: o índice da busca não foi gerado.');
            return;
          }
          const written = await index.writeFiles({ outputPath: `${site}/pagefind` });
          if (written.errors.length > 0) throw new Error(written.errors.join('\n'));
          logger.info(`Índice da busca com ${indexed.page_count} post(s).`);
        } finally {
          await pagefind.close();
        }
      },
    },
  };
}
