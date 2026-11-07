import { defineHastPlugin } from 'satteri';

/**
 * Plugin do Sätteri: cada tabela dos posts vai para dentro de uma região rolável.
 * No celular, a tabela larga rola para os lados sem estourar a coluna nem perder a semântica
 * de tabela (o `display` da <table> não muda). A região recebe foco (tabindex="0") para que dê
 * para rolar pelo teclado, e um nome para leitores de tela. Estilo em `.tabela` (tipografia.css).
 */
export const tabelasRolaveis = defineHastPlugin({
  name: 'tabelas-rolaveis',
  element: {
    filter: ['table'],
    visit(tabela, ctx) {
      ctx.wrapNode(tabela, {
        type: 'element',
        tagName: 'div',
        properties: { className: ['tabela'], role: 'region', ariaLabel: 'Tabela', tabIndex: 0 },
        children: [],
      });
    },
  },
});
