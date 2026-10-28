/**
 * Avisa Bing, Yandex e outros buscadores, pelo IndexNow, dos posts que mudaram num deploy.
 * Roda no deploy.yml depois da publicação, quando o arquivo da chave (/indexnow.txt) já está no ar.
 *
 * Os posts são os que mudaram em src/content/posts/ entre o commit do deploy anterior
 * (BASE_SHA, o "before" do push) e o atual. Entra o post publicado agora e também o que estava
 * publicado e saiu do ar (removido ou de volta a rascunho), para o buscador ver o 404. Rascunho
 * que nunca foi publicado fica de fora. Se algum post entrou, a home vai junto, porque lista os posts.
 *
 * Uso: BASE_SHA=<commit> node scripts/indexnow.ts. INDEXNOW_SIMULAR=1 só mostra o que seria enviado.
 * Uma falha no envio vira aviso, sem quebrar o deploy: o site já foi publicado.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { site } from '../site.config.ts';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const base = process.env.BASE_SHA ?? '';

function aviso(mensagem: string): never {
  // No GitHub Actions, ::warning:: aparece em destaque no resumo da execução.
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${mensagem}` : mensagem);
  process.exit(0);
}

// Push que cria o branch, workflow_dispatch ou commit anterior fora do histórico: não há o que comparar.
if (!/^[0-9a-f]{40}$/.test(base) || /^0+$/.test(base)) {
  console.log('IndexNow: sem commit anterior para comparar; nada a enviar.');
  process.exit(0);
}

let alterados: string[];
try {
  alterados = execFileSync('git', ['diff', '--name-only', base, 'HEAD', '--', 'src/content/posts/'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch {
  aviso(`IndexNow: não foi possível comparar ${base.slice(0, 7)} com o commit atual; nada foi enviado.`);
}

const slugs = [...new Set(alterados.map((arquivo) => arquivo.split('/')[3]).filter((slug): slug is string => Boolean(slug)))];
if (slugs.length === 0) {
  console.log('IndexNow: nenhum post mudou; nada a enviar.');
  process.exit(0);
}

/** O post estava publicado no commit anterior: existia e não era rascunho. */
function publicadoAntes(slug: string): boolean {
  try {
    const texto = execFileSync('git', ['show', `${base}:src/content/posts/${slug}/index.md`], { encoding: 'utf8', stdio: 'pipe' });
    const frontmatter = texto.split(/^---$/m)[1] ?? '';
    return !/^draft:\s*true\b/m.test(frontmatter);
  } catch {
    return false;
  }
}

const enviar = slugs.filter((slug) => {
  const publicado = existsSync(`dist/posts/${slug}.html`);
  if (publicado) console.log(`- /posts/${slug}`);
  else if (publicadoAntes(slug)) console.log(`- /posts/${slug} (saiu do ar)`);
  else return false;
  return true;
});
if (enviar.length === 0) {
  console.log('IndexNow: só rascunhos mudaram; nada a enviar.');
  process.exit(0);
}

const url = (caminho: string) => new URL(caminho, site.url).href;
const urls = [url('/'), ...enviar.map((slug) => url(`/posts/${slug}`))];

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
