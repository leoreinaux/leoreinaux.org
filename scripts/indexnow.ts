/**
 * Avisa Bing, Yandex e outros buscadores, pelo IndexNow, dos posts e tutoriais que mudaram num deploy.
 * Roda no deploy.yml depois da publicação, quando o arquivo da chave (/indexnow.txt) já está no ar.
 *
 * Os textos são os que mudaram em src/content/posts/ e src/content/tutoriais/ entre o commit do último deploy publicado
 * (BASE_SHA, que o deploy.yml busca na API do GitHub Actions) e o atual. Entra o texto publicado agora e também o que estava
 * publicado e saiu do ar (removido ou de volta a rascunho), para o buscador ver o 404. Rascunho
 * que nunca foi publicado fica de fora. Se algum texto entrou, a página que o lista vai junto: a home para os posts
 * e /tutoriais para os tutoriais.
 *
 * Uso: BASE_SHA=<commit> node scripts/indexnow.ts. INDEXNOW_SIMULAR=1 só mostra o que seria enviado.
 * Uma falha no envio vira aviso, sem quebrar o deploy: o site já foi publicado.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { site } from '../site.config.ts';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const COLECOES = ['posts', 'tutoriais'];
const base = process.env.BASE_SHA ?? '';

function aviso(mensagem: string): never {
  // No GitHub Actions, ::warning:: aparece em destaque no resumo da execução.
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${mensagem}` : mensagem);
  process.exit(0);
}

// Primeiro deploy (sem deploy anterior publicado) ou BASE_SHA inválido: não há o que comparar.
if (!/^[0-9a-f]{40}$/.test(base) || /^0+$/.test(base)) {
  console.log('IndexNow: sem commit anterior para comparar; nada a enviar.');
  process.exit(0);
}

let alterados: string[];
try {
  alterados = execFileSync('git', ['diff', '--name-only', base, 'HEAD', '--', ...COLECOES.map((colecao) => `src/content/${colecao}/`)], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
} catch {
  aviso(`IndexNow: não foi possível comparar ${base.slice(0, 7)} com o commit atual; nada foi enviado.`);
}

/** Caminho de cada texto que mudou, sem repetir: /posts/<slug> ou /tutoriais/<slug>. */
const caminhos = [
  ...new Set(
    alterados.flatMap((arquivo) => {
      const [, , colecao, slug] = arquivo.split('/');
      return colecao && slug ? [`/${colecao}/${slug}`] : [];
    }),
  ),
];
if (caminhos.length === 0) {
  console.log('IndexNow: nenhum post ou tutorial mudou; nada a enviar.');
  process.exit(0);
}

/** O texto estava publicado no commit anterior: existia e não era rascunho. */
function publicadoAntes(caminho: string): boolean {
  try {
    const texto = execFileSync('git', ['show', `${base}:src/content${caminho}/index.md`], { encoding: 'utf8', stdio: 'pipe' });
    const frontmatter = texto.split(/^---$/m)[1] ?? '';
    return !/^draft:\s*true\b/m.test(frontmatter);
  } catch {
    return false;
  }
}

const enviar = caminhos.filter((caminho) => {
  const publicado = existsSync(`dist${caminho}.html`);
  if (publicado) console.log(`- ${caminho}`);
  else if (publicadoAntes(caminho)) console.log(`- ${caminho} (saiu do ar)`);
  else return false;
  return true;
});
if (enviar.length === 0) {
  console.log('IndexNow: só rascunhos mudaram; nada a enviar.');
  process.exit(0);
}

const url = (caminho: string) => new URL(caminho, site.url).href;
// A página que lista cada texto: a home para os posts, /tutoriais para os tutoriais.
const listas = [...new Set(enviar.map((caminho) => (caminho.startsWith('/tutoriais/') ? '/tutoriais' : '/')))];
const urls = [...listas, ...enviar].map(url);

const corpo = {
  host: new URL(site.url).host,
  key: site.indexNowKey,
  keyLocation: url('/indexnow.txt'),
  urlList: urls,
};

if (process.env.INDEXNOW_SIMULAR === '1') {
  console.log(JSON.stringify(corpo, null, 2));
  process.exit(0);
}

try {
  const resposta = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(corpo),
  });
  // 200: recebido; 202: recebido, chave ainda em validação.
  if (resposta.status === 200 || resposta.status === 202) {
    console.log(`IndexNow: ${urls.length} URL(s) enviada(s) (HTTP ${resposta.status}).`);
  } else {
    aviso(`IndexNow respondeu HTTP ${resposta.status}: ${await resposta.text()}`);
  }
} catch (erro) {
  aviso(`IndexNow: falha ao enviar (${erro instanceof Error ? erro.message : String(erro)}).`);
}
