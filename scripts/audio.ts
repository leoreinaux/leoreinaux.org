/**
 * Gera a versão em áudio dos posts e tutoriais: audio.mp3 e audio.json na pasta de cada texto.
 * A voz é o Piper (open source, roda no computador, sem serviço externo), com o modelo de site.audio.voz.
 * O texto lido sai de src/lib/narracao.ts; o audio.json guarda a impressão digital dele, para o
 * script só gerar de novo o que mudou e o build avisar quando um áudio ficou desatualizado.
 *
 * Uso:
 *   npm run audio                  textos publicados sem áudio ou com o texto mudado
 *   npm run audio -- <slug> ...    só esses textos, inclusive rascunhos
 *   AUDIO_FORCAR=1 npm run audio   gera de novo mesmo sem mudança (por exemplo, depois de trocar a voz)
 *   AUDIO_SIMULAR=1 npm run audio  só mostra o texto que seria lido
 *
 * Gravação própria: troque o audio.mp3 pelo seu e ponha "gravacao": true no audio.json; o script
 * passa a só atualizar a duração e o tamanho, sem sobrescrever o arquivo.
 *
 * Requisitos (ver README): Python 3 com piper-tts, a voz baixada e ffmpeg com libmp3lame.
 * PIPER_PYTHON troca o Python (padrão: python3); PIPER_VOZES, a pasta das vozes (padrão: ~/.local/share/piper).
 */

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { site } from '../site.config.ts';
import { narracaoDoTexto, type InfoDoAudio, type Narracao } from '../src/lib/narracao.ts';

const forcar = process.env.AUDIO_FORCAR === '1';
const simular = process.env.AUDIO_SIMULAR === '1';
const python = process.env.PIPER_PYTHON ?? 'python3';
const pastaDasVozes = process.env.PIPER_VOZES ?? join(homedir(), '.local/share/piper');
const modelo = join(pastaDasVozes, `${site.audio.voz}.onnx`);
const pedidos = process.argv.slice(2);

function exigir(comando: string, argumentos: string[], ajuda: string): void {
  try {
    execFileSync(comando, argumentos, { stdio: 'ignore' });
  } catch {
    console.error(ajuda);
    process.exit(1);
  }
}

function duracaoEmSegundos(arquivo: string): number {
  const saida = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo], { encoding: 'utf8' });
  return Number.parseFloat(saida);
}

/** 843.2 → "PT14M3S". */
function iso(segundos: number): string {
  const total = Math.round(segundos);
  const [h, m, s] = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || !(h || m) ? `${s}S` : ''}`;
}

function lerInfo(arquivo: string): InfoDoAudio | undefined {
  return existsSync(arquivo) ? (JSON.parse(readFileSync(arquivo, 'utf8')) as InfoDoAudio) : undefined;
}

function gravarInfo(arquivo: string, info: InfoDoAudio): void {
  writeFileSync(arquivo, `${JSON.stringify(info, null, 2)}\n`);
}

/** Piper → PCM cru → ffmpeg (volume normalizado para fala, MP3 mono) → audio.mp3. */
async function sintetizar(texto: Narracao, destino: string, titulo: string, ano: number): Promise<void> {
  const { audio } = JSON.parse(readFileSync(`${modelo}.json`, 'utf8')) as { audio: { sample_rate: number } };
  const temporario = `${destino}.tmp.mp3`;
  const piper = spawn(python, ['-B', join(import.meta.dirname, 'narrar.py'), modelo], { stdio: ['pipe', 'pipe', 'inherit'] });
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 's16le', '-ar', String(audio.sample_rate), '-ac', '1', '-i', 'pipe:0',
      // -16 LUFS, o volume de referência de podcasts de fala.
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '22050', '-ac', '1',
      '-codec:a', 'libmp3lame', '-b:a', '48k',
      '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-id3v2_version', '3',
      '-metadata', `title=${titulo}`,
      '-metadata', `artist=${site.author.name}`,
      '-metadata', `album=${site.name}`,
      '-metadata', `date=${ano}`,
      '-metadata', 'genre=Speech',
      '-metadata', `copyright=${site.contentLicense.name}, ${site.url}`,
      '-metadata', `comment=Narração com voz sintética (Piper, ${site.audio.voz}).`,
      temporario,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  piper.stdout.pipe(ffmpeg.stdin);
  piper.stdin.end(JSON.stringify(texto.blocos));
  const fim = (processo: ChildProcess, nome: string) =>
    new Promise<void>((ok, erro) => processo.on('close', (codigo) => (codigo === 0 ? ok() : erro(new Error(`${nome} terminou com o código ${codigo}`)))));
  await Promise.all([fim(piper, 'Piper'), fim(ffmpeg, 'ffmpeg')]);
  renameSync(temporario, destino);
}

const textos = ['posts', 'tutoriais'].flatMap((colecao) =>
  readdirSync(`src/content/${colecao}`)
    .filter((slug) => existsSync(`src/content/${colecao}/${slug}/index.md`))
    .map((slug) => ({ colecao, slug, pasta: `src/content/${colecao}/${slug}` })),
);

const escolhidos = pedidos.length ? textos.filter(({ colecao, slug }) => pedidos.includes(slug) || pedidos.includes(`${colecao}/${slug}`)) : textos;
const naoAchados = pedidos.filter((pedido) => !textos.some(({ colecao, slug }) => pedido === slug || pedido === `${colecao}/${slug}`));
if (naoAchados.length) {
  console.error(`Texto não encontrado: ${naoAchados.join(', ')}`);
  process.exit(1);
}

if (!simular) {
  exigir('ffmpeg', ['-hide_banner', '-h', 'encoder=libmp3lame'], 'É preciso o ffmpeg com libmp3lame (por exemplo: sudo apt install ffmpeg, ou brew install ffmpeg).');
  exigir(python, ['-c', 'import piper'], `É preciso o Piper no Python (${python}): pip install piper-tts`);
  if (!existsSync(modelo)) {
    console.error(`Voz não encontrada em ${modelo}. Baixe com:\n  ${python} -m piper.download_voices ${site.audio.voz} --data-dir ${pastaDasVozes}`);
    process.exit(1);
  }
}

let gerados = 0;
for (const { colecao, slug, pasta } of escolhidos) {
  const nome = `${colecao}/${slug}`;
  const fonte = readFileSync(join(pasta, 'index.md'), 'utf8');
  const [, frontmatter = '', corpo = ''] = fonte.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/) ?? [];
  const dados = parse(frontmatter) as { title: string; summary: string; pubDate: string | Date; draft?: boolean };
  if (dados.draft && !pedidos.length) continue;

  const texto = narracaoDoTexto({ title: dados.title, summary: dados.summary, corpo }, site);
  const mp3 = join(pasta, 'audio.mp3');
  const json = join(pasta, 'audio.json');
  const info = lerInfo(json);

  if (simular) {
    console.log(`\n=== ${nome} (${texto.hash})\n`);
    console.log(texto.blocos.map(({ texto }) => texto).join('\n\n'));
    continue;
  }
  if (info?.gravacao) {
    if (existsSync(mp3)) gravarInfo(json, { ...info, duracao: iso(duracaoEmSegundos(mp3)), bytes: statSync(mp3).size });
    console.log(`${nome}: gravação própria, só a duração e o tamanho foram atualizados.`);
    continue;
  }
  if (!forcar && info?.texto === texto.hash && info.voz === site.audio.voz && existsSync(mp3)) {
    console.log(`${nome}: áudio em dia.`);
    continue;
  }

  console.log(`${nome}: gerando o áudio…`);
  await sintetizar(texto, mp3, dados.title, new Date(dados.pubDate).getUTCFullYear());
  const novo: InfoDoAudio = { voz: site.audio.voz, duracao: iso(duracaoEmSegundos(mp3)), bytes: statSync(mp3).size, texto: texto.hash };
  gravarInfo(json, novo);
  console.log(`${nome}: ${novo.duracao}, ${(novo.bytes / 1024 / 1024).toFixed(1)} MB.`);
  gerados++;
}

if (!simular) console.log(`\n${gerados} áudio(s) gerado(s). Ouça antes de publicar e faça o commit do audio.mp3 e do audio.json.`);
