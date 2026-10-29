/**
 * Verificação de qualidade do site gerado (dist/), usada pelo workflow antes de cada deploy.
 *
 * - axe-core: regras WCAG 2.2 A/AA em cada página, nos temas claro e escuro, no celular e no desktop.
 * - Lighthouse: metas de docs/arquitetura.md (celular intermediário em 4G, simulado).
 *
 * Uso: npm run qualidade (depois de um build). O Chrome vem da variável CHROME_PATH.
 * Sai com código 1 se alguma meta cair.
 */
import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, readdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import lighthouse, { type RunnerResult } from 'lighthouse';
import { chromium, type Browser } from 'playwright-core';

const PORTA = 4322;
const DEPURACAO = 9222;
const BASE = `http://localhost:${PORTA}`;
/** Execuções do Lighthouse por página; vale a mediana, porque a medição varia. */
const EXECUCOES = Number(process.env.LIGHTHOUSE_EXECUCOES ?? 3);

interface Pagina {
  caminho: string;
  /** Post: entra a meta de peso total. */
  post?: boolean;
  /** Página fora dos buscadores (noindex) ou de erro: sem a nota de SEO. */
  semSeo?: boolean;
  /** Página de erro (404): o Lighthouse não mede páginas com erro. */
  semLighthouse?: boolean;
}

/** Metas de docs/arquitetura.md; INP não se mede em laboratório, então o TBT faz as vezes dele. */
const metas = {
  desempenho: 0.9,
  acessibilidade: 1,
  boasPraticas: 0.9,
  seo: 0.9,
  lcpMs: 2000,
  cls: 0.05,
  tbtMs: 200,
  jsBytes: 30 * 1024,
  postBytes: 300 * 1024,
};

const posts = readdirSync('dist/posts')
  .filter((arquivo) => arquivo.endsWith('.html'))
  .map((arquivo) => `/posts/${arquivo.replace(/\.html$/, '')}`);

const paginas: Pagina[] = [
  { caminho: '/' },
  { caminho: '/sobre' },
  { caminho: '/privacidade' },
  { caminho: '/newsletter' },
  { caminho: '/busca', semSeo: true },
  { caminho: '/pagina-que-nao-existe', semSeo: true, semLighthouse: true },
  ...posts.map((caminho) => ({ caminho, post: true })),
];

const falhas: string[] = [];
const linhas: string[] = [];

function servidor(): Promise<() => void> {
  // O astro preview pode seguir em segundo plano depois que o processo que o chamou sai;
  // por isso ele é parado pelo próprio comando, antes (sobra de outra execução) e depois do teste.
  const parar = () => {
    try {
      execFileSync('npx', ['astro', 'preview', 'stop'], { stdio: 'ignore' });
    } catch {
      // Nenhum servidor rodando.
    }
  };
  parar();
  spawn('npx', ['astro', 'preview', '--port', String(PORTA)], { stdio: 'ignore', detached: true }).unref();
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const tentar = async () => {
      try {
        await fetch(BASE);
        resolve(parar);
      } catch {
        if (Date.now() - inicio > 30_000) {
          parar();
          reject(new Error('O astro preview não respondeu em 30 s.'));
        } else setTimeout(tentar, 500);
      }
    };
    tentar();
  });
}

async function acessibilidade(navegador: Browser) {
  // Na busca, testa também a lista de resultados, com uma palavra do título do primeiro post.
  const termo = posts.length > 0 ? 'o' : '';
  const alvos = paginas.map(({ caminho }) => (caminho === '/busca' && termo ? `/busca?q=${termo}` : caminho));
  for (const tema of ['light', 'dark'] as const) {
    for (const [dispositivo, largura] of [
      ['celular', 390],
      ['desktop', 1280],
    ] as const) {
      const contexto = await navegador.newContext({ colorScheme: tema, viewport: { width: largura, height: 800 } });
      for (const caminho of alvos) {
        const pagina = await contexto.newPage();
        await pagina.goto(BASE + caminho, { waitUntil: 'networkidle' });
        if (caminho.startsWith('/busca?')) await pagina.waitForFunction(() => document.querySelector('#busca-status')?.textContent);
        const { violations } = await new AxeBuilder({ page: pagina })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        for (const v of violations) {
          const onde = v.nodes.map((n) => n.target.join(' ')).join(', ');
          falhas.push(`axe ${caminho} (${tema}, ${dispositivo}): ${v.id}: ${v.help} [${onde}]`);
        }
        await pagina.close();
      }
      await contexto.close();
    }
  }
  console.log(`axe-core: ${alvos.length} páginas × 2 temas × 2 larguras.`);
}

const mediana = (valores: number[]) => [...valores].sort((a, b) => a - b)[Math.floor(valores.length / 2)]!;

async function desempenho() {
  linhas.push(
    '| Página | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT | JS | Total |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const pagina of paginas.filter((p) => !p.semLighthouse)) {
    const execucoes: RunnerResult['lhr'][] = [];
    for (let i = 0; i < EXECUCOES; i++) {
      const resultado = await lighthouse(BASE + pagina.caminho, { port: DEPURACAO, output: 'json', logLevel: 'error' });
      if (!resultado) throw new Error(`O Lighthouse não gerou relatório para ${pagina.caminho}.`);
      if (resultado.lhr.runtimeError) throw new Error(`${pagina.caminho}: ${resultado.lhr.runtimeError.message}`);
      execucoes.push(resultado.lhr);
    }
    const nota = (categoria: string) => mediana(execucoes.map((lhr) => lhr.categories[categoria]?.score ?? 0));
    const valor = (auditoria: string) => mediana(execucoes.map((lhr) => lhr.audits[auditoria]?.numericValue ?? Infinity));
    const bytes = (tipo: string) => {
      const itens = (execucoes[0]!.audits['resource-summary']?.details as { items?: { resourceType: string; transferSize: number }[] })?.items;
      return itens?.find((item) => item.resourceType === tipo)?.transferSize ?? 0;
    };

    const m = {
      desempenho: nota('performance'),
      acessibilidade: nota('accessibility'),
      boasPraticas: nota('best-practices'),
      seo: nota('seo'),
      lcpMs: valor('largest-contentful-paint'),
      cls: valor('cumulative-layout-shift'),
      tbtMs: valor('total-blocking-time'),
      jsBytes: bytes('script'),
      postBytes: bytes('total'),
    };
    const verificar = (nome: string, ok: boolean, detalhe: string) => {
      if (!ok) falhas.push(`Lighthouse ${pagina.caminho}: ${nome} ${detalhe}`);
    };
    verificar('desempenho', m.desempenho >= metas.desempenho, `${m.desempenho} < ${metas.desempenho}`);
    verificar('acessibilidade', m.acessibilidade >= metas.acessibilidade, `${m.acessibilidade} < ${metas.acessibilidade}`);
    verificar('boas práticas', m.boasPraticas >= metas.boasPraticas, `${m.boasPraticas} < ${metas.boasPraticas}`);
    if (!pagina.semSeo) verificar('SEO', m.seo >= metas.seo, `${m.seo} < ${metas.seo}`);
    verificar('LCP', m.lcpMs <= metas.lcpMs, `${Math.round(m.lcpMs)} ms > ${metas.lcpMs} ms`);
    verificar('CLS', m.cls <= metas.cls, `${m.cls.toFixed(3)} > ${metas.cls}`);
    verificar('TBT', m.tbtMs <= metas.tbtMs, `${Math.round(m.tbtMs)} ms > ${metas.tbtMs} ms`);
    verificar('JavaScript', m.jsBytes <= metas.jsBytes, `${kb(m.jsBytes)} > ${kb(metas.jsBytes)}`);
    if (pagina.post) verificar('peso total', m.postBytes <= metas.postBytes, `${kb(m.postBytes)} > ${kb(metas.postBytes)}`);

    linhas.push(
      `| ${pagina.caminho} | ${m.desempenho} | ${m.acessibilidade} | ${m.boasPraticas} | ${pagina.semSeo ? '—' : m.seo} | ${Math.round(m.lcpMs)} ms | ${m.cls.toFixed(3)} | ${Math.round(m.tbtMs)} ms | ${kb(m.jsBytes)} | ${kb(m.postBytes)} |`,
    );
  }
}

function kb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

if (!process.env.CHROME_PATH) {
  console.error('Defina CHROME_PATH com o caminho do Chrome ou Chromium.');
  process.exit(1);
}

const parar = await servidor();
const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: [`--remote-debugging-port=${DEPURACAO}`] });
try {
  await acessibilidade(navegador);
  await desempenho();
} finally {
  await navegador.close();
  parar();
}

const relatorio = [
  '## Qualidade',
  '',
  `Lighthouse (mediana de ${EXECUCOES} execuções, celular em 4G simulado):`,
  '',
  ...linhas,
  '',
  falhas.length === 0 ? 'Todas as metas foram cumpridas.' : `**${falhas.length} falha(s):**\n\n${falhas.map((f) => `- ${f}`).join('\n')}`,
].join('\n');
console.log(relatorio);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, relatorio + '\n');
process.exit(falhas.length === 0 ? 0 : 1);
