import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

/**
 * Completa a Content-Security-Policy que o Astro grava numa <meta> de cada página (security.csp em
 * astro.config.ts). O Astro só calcula o hash dos scripts que ele processa; os `is:inline` (tema,
 * Compartilhar) ficariam bloqueados. Ao fim do build, esta integração soma ao script-src o hash de
 * cada script inline da página. O JSON-LD não executa e fica de fora.
 */
export default function cspScriptsInline(): AstroIntegration {
  return {
    name: 'csp-scripts-inline',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const raiz = fileURLToPath(dir);
        const arquivos = (await readdir(raiz, { recursive: true })).filter((nome) => nome.endsWith('.html'));
        let paginas = 0;
        for (const nome of arquivos) {
          const caminho = join(raiz, nome);
          const html = await readFile(caminho, 'utf8');
          const hashes = new Set<string>();
          for (const [, atributos, codigo] of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
            if (/\ssrc=|application\/ld\+json/.test(atributos ?? '') || !codigo!.trim()) continue;
            hashes.add(`'sha256-${createHash('sha256').update(codigo!).digest('base64')}'`);
          }
          if (hashes.size === 0) continue;
          let alterou = false;
          const novo = html.replace(
            /(<meta http-equiv="content-security-policy" content="[^"]*?script-src )/,
            (inicio) => {
              alterou = true;
              return `${inicio}${[...hashes].join(' ')} `;
            },
          );
          if (!alterou) throw new Error(`${nome} tem scripts inline, mas não tem a <meta> da CSP com script-src.`);
          await writeFile(caminho, novo);
          paginas++;
        }
        logger.info(`Hashes dos scripts inline somados à CSP de ${paginas} página(s).`);
      },
    },
  };
}
