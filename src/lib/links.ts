import { defineHastPlugin } from 'satteri';
import { site } from '../../site.config';

/**
 * Links externos abrem em nova aba. Para quem usa leitor de tela, cada um aponta com
 * aria-describedby para o aviso "abre em nova aba", que fica uma vez só no BaseLayout.
 */
export const NOVA_ABA_ID = 'nova-aba';

/** Atributos de um link externo nos componentes; `rel` soma-se ao noopener (ex.: 'me', 'license'). */
export function externo(rel?: string) {
  return {
    target: '_blank',
    rel: rel ? `${rel} noopener` : 'noopener',
    'aria-describedby': NOVA_ABA_ID,
  };
}

function ehExterno(href: unknown): boolean {
  if (typeof href !== 'string' || !/^https?:\/\//.test(href)) return false;
  return new URL(href).host !== new URL(site.url).host;
}

/** Plugin do Sätteri (o processador de Markdown do Astro 7): os mesmos atributos nos links externos dos posts. */
export const linksExternos = defineHastPlugin({
  name: 'links-externos',
  element: {
    filter: ['a'],
    visit(link, ctx) {
      if (!ehExterno(link.properties.href)) return;
      ctx.setProperty(link, 'target', '_blank');
      ctx.setProperty(link, 'rel', ['noopener']);
      ctx.setProperty(link, 'ariaDescribedBy', [NOVA_ABA_ID]);
    },
  },
});
