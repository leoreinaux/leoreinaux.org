/**
 * Cria e agenda no Listmonk a campanha de cada post novo com newsletter: true.
 * Roda no deploy.yml depois da publicação, quando o post e a capa já estão no ar.
 *
 * - Lê dist/newsletter.json, gerado no build (src/pages/newsletter.json.ts).
 * - Só considera posts publicados nos últimos DIAS_MAXIMOS dias, para um post antigo nunca virar e-mail.
 * - Idempotente: a campanha leva a tag post:<slug>; se já existe uma, o post é ignorado. Não guarda estado.
 * - Mantém o modelo "Novo post" do Listmonk igual a infra/listmonk/novo-post.html.
 * - Agenda para newsletter.sendTime (fuso newsletter.sendTimeZone) do dia seguinte à publicação; com o
 *   deploy de madrugada, no mesmo dia, desde que sobrem MARGEM_MINIMA_H horas para revisar ou cancelar.
 *
 * Credenciais nos secrets do GitHub: LISTMONK_API_USER e LISTMONK_API_TOKEN (usuário de API do Listmonk,
 * ver infra/README.md). Sem elas ou sem newsletter.listUuid, o script não faz nada.
 * NEWSLETTER_SIMULAR=1 consulta o Listmonk mas só mostra o que faria. LISTMONK_URL troca o endereço (testes).
 * Uma falha vira aviso, sem quebrar o deploy: o site já foi publicado e o próximo deploy tenta de novo.
 */
import { readFileSync } from 'node:fs';
import { site } from '../site.config.ts';

const DIAS_MAXIMOS = 7;
const MARGEM_MINIMA_H = 2;
const NOME_MODELO = 'Novo post';

interface Post {
  slug: string;
  title: string;
  summary: string;
  url: string;
  pubDate: string;
  cover: { url: string; alt: string };
}

const simular = process.env.NEWSLETTER_SIMULAR === '1';
const base = (process.env.LISTMONK_URL ?? site.newsletter.listmonkUrl).replace(/\/$/, '');
const usuario = process.env.LISTMONK_API_USER;
const token = process.env.LISTMONK_API_TOKEN;

function aviso(mensagem: string): never {
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${mensagem}` : mensagem);
  process.exit(0);
}

async function api<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(`${base}/api${caminho}`, {
    method: metodo,
    headers: { Authorization: `token ${usuario}:${token}`, 'Content-Type': 'application/json' },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
  const json = (await resposta.json().catch(() => ({}))) as { data?: T; message?: string };
  if (!resposta.ok) throw new Error(`${metodo} ${caminho}: HTTP ${resposta.status} ${json.message ?? ''}`.trim());
  return json.data as T;
}

/** Data (AAAA-MM-DD) e deslocamento (+HH:MM) de um instante no fuso de envio. */
function noFuso(instante: Date): { data: string; deslocamento: string } {
  const zona = site.newsletter.sendTimeZone;
  const data = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instante);
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })
    .formatToParts(instante)
    .find((parte) => parte.type === 'timeZoneName')!.value;
  return { data, deslocamento: nome === 'GMT' ? '+00:00' : nome.replace('GMT', '') };
}

/** Próximo horário de envio com pelo menos MARGEM_MINIMA_H horas a partir de agora. */
function horarioDeEnvio(agora: Date): Date {
  for (let dias = 0; dias < 3; dias++) {
    const dia = noFuso(new Date(agora.getTime() + dias * 86_400_000));
    // O deslocamento do fuso é o do próprio dia, ao meio-dia (horário de verão, onde houver).
    const { deslocamento } = noFuso(new Date(`${dia.data}T12:00:00Z`));
    const candidato = new Date(`${dia.data}T${site.newsletter.sendTime}:00${deslocamento}`);
    if (candidato.getTime() - agora.getTime() >= MARGEM_MINIMA_H * 3_600_000) return candidato;
  }
  throw new Error('Não foi possível calcular o horário de envio.');
}

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Corpo da campanha: capa, título, resumo e botão para o post. O modelo põe cabeçalho e rodapé. */
function corpoHtml(post: Post): string {
  const titulos = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  return [
    `<a href="${escapar(post.url)}"><img src="${escapar(post.cover.url)}" alt="${escapar(post.cover.alt)}" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0; border-radius: 6px"></a>`,
    `<h1 style="margin: 24px 0 16px; font-family: ${titulos}; font-size: 28px; line-height: 1.25; color: #1c1b19"><a href="${escapar(post.url)}" style="color: #1c1b19; text-decoration: none">${escapar(post.title)}</a></h1>`,
    `<p style="margin: 0 0 24px">${escapar(post.summary)}</p>`,
    `<p style="margin: 0"><a href="${escapar(post.url)}" style="display: inline-block; padding: 12px 20px; border-radius: 6px; background: #1d4f7d; color: #faf8f3; font-family: ${titulos}; font-size: 16px; font-weight: 600; text-decoration: none">Ler no site</a></p>`,
  ].join('\n');
}

/** Versão em texto puro, para programas de e-mail que não mostram HTML. */
function corpoTexto(post: Post): string {
  return `${post.title}\n\n${post.summary}\n\nLer no site: ${post.url}\n\n--\nPara não receber mais estes e-mails: {{ UnsubscribeURL }}\n`;
}

if (!usuario || !token || !site.newsletter.listUuid) {
  console.log('Newsletter: Listmonk ainda não configurado (credenciais ou newsletter.listUuid); nada a fazer.');
  process.exit(0);
}

const hoje = noFuso(new Date()).data;
const limite = new Date(Date.parse(`${hoje}T00:00:00Z`) - DIAS_MAXIMOS * 86_400_000).toISOString().slice(0, 10);
const posts = (JSON.parse(readFileSync('dist/newsletter.json', 'utf8')) as Post[]).filter((post) => post.pubDate >= limite);
if (posts.length === 0) {
  console.log(`Newsletter: nenhum post com newsletter: true publicado desde ${limite}; nada a fazer.`);
  process.exit(0);
}

try {
  const listas = await api<{ results: { id: number; uuid: string }[] }>('GET', '/lists?per_page=all');
  const lista = listas.results.find((l) => l.uuid === site.newsletter.listUuid);
  if (!lista) throw new Error(`a lista ${site.newsletter.listUuid} não existe no Listmonk`);

  // Modelo igual ao do repositório.
  const html = readFileSync('infra/listmonk/novo-post.html', 'utf8');
  const modelos = await api<{ id: number; name: string; body: string }[]>('GET', '/templates');
  let modelo = modelos.find((m) => m.name === NOME_MODELO);
  if (!simular) {
    if (!modelo) {
      modelo = await api('POST', '/templates', { name: NOME_MODELO, type: 'campaign', body: html });
      console.log(`Modelo "${NOME_MODELO}" criado.`);
    } else if (modelo.body !== html) {
      await api('PUT', `/templates/${modelo.id}`, { name: NOME_MODELO, type: 'campaign', body: html });
      console.log(`Modelo "${NOME_MODELO}" atualizado.`);
    }
  }

  const campanhas = await api<{ results: { tags: string[] }[] }>('GET', '/campaigns?per_page=all');
  const existentes = new Set(campanhas.results.flatMap((c) => c.tags));

  for (const post of posts) {
    const tag = `post:${post.slug}`;
    if (existentes.has(tag)) {
      console.log(`- ${post.slug}: campanha já existe.`);
      continue;
    }
    const envio = horarioDeEnvio(new Date());
    const quando = envio.toLocaleString('pt-BR', { timeZone: site.newsletter.sendTimeZone, dateStyle: 'short', timeStyle: 'short' });
    if (simular || !modelo) {
      console.log(`- ${post.slug}: criaria a campanha "${post.title}", agendada para ${quando}.`);
      continue;
    }
    const campanha = await api<{ id: number }>('POST', '/campaigns', {
      name: post.title,
      subject: post.title,
      lists: [lista.id],
      type: 'regular',
      content_type: 'html',
      body: corpoHtml(post),
      altbody: corpoTexto(post),
      template_id: modelo.id,
      tags: [tag],
      messenger: 'email',
      send_at: envio.toISOString(),
    });
    await api('PUT', `/campaigns/${campanha.id}/status`, { status: 'scheduled' });
    console.log(`- ${post.slug}: campanha ${campanha.id} agendada para ${quando} (${site.newsletter.sendTimeZone}).`);
  }
} catch (erro) {
  aviso(`Newsletter: ${erro instanceof Error ? erro.message : String(erro)}. Nada foi agendado; o próximo deploy tenta de novo.`);
}
