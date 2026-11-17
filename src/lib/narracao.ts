import { createHash } from 'node:crypto';

/**
 * Texto que a voz sintética lê na versão em áudio de um post ou tutorial.
 * Sem dependências do Astro: roda no build (src/lib/audio.ts, que avisa quando o áudio ficou
 * desatualizado) e no Node (scripts/audio.ts, que gera o MP3). Por isso não importa o site.config.ts:
 * quem chama passa autor, endereço, licença e pronúncias.
 */

/** O audio.json da pasta de cada texto, escrito pelo scripts/audio.ts. */
export interface InfoDoAudio {
  /** Voz do Piper usada (ou o que for, numa gravação própria). */
  voz: string;
  /** Duração em ISO 8601 (PT14M3S). */
  duracao: string;
  bytes: number;
  /** Impressão digital do texto narrado quando o áudio foi gerado (Narracao.hash). */
  texto: string;
  /** true: gravação própria, que o script nunca sobrescreve e o build não compara com o texto. */
  gravacao?: boolean;
}

/** Um trecho lido de uma vez, seguido de uma pausa (em segundos). */
export interface Bloco {
  texto: string;
  pausa: number;
}

export interface EntradaDaNarracao {
  titulo: string;
  resumo: string;
  /** Corpo em Markdown, sem o frontmatter. */
  corpo: string;
  autor: string;
  /** Endereço do site sem o protocolo, por exemplo leoreinaux.org. */
  endereco: string;
  /** Nome curto da licença dos textos, por exemplo CC BY 4.0. */
  licenca: string;
  /** Palavras que a voz pronuncia errado → como falar (site.config.ts, audio.pronuncia). */
  pronuncia: Record<string, string>;
}

export interface Narracao {
  blocos: Bloco[];
  /** Impressão digital do texto narrado: muda quando o texto muda e o áudio precisa ser gerado de novo. */
  hash: string;
}

/** Pausas em segundos; o scripts/narrar.py ainda põe um respiro curto entre as frases de um bloco. */
const PAUSA = { item: 0.35, paragrafo: 0.6, titulo: 1.0 };

const AVISO_DE_CODIGO = 'Neste ponto, o texto traz um trecho de código, que está na versão escrita.';

/** A seção de fontes, no fim dos textos, não é lida: são títulos e links. */
const SECAO_DE_FONTES = /^#{2,6}\s+(fontes|refer[êe]ncias)\s*$/i;

/** Ajustes que valem para qualquer texto em português; os do autor ficam no site.config.ts. */
const AJUSTES: [RegExp, string][] = [
  [/\bR\$\s?([\d.,]+)(\s(?:mil|milhões|milhão|bilhões|bilhão))?/g, '$1$2 reais'],
  [/\bUS\$\s?([\d.,]+)(\s(?:mil|milhões|milhão|bilhões|bilhão))?/g, '$1$2 dólares'],
  [/\bCC BY (\d)\.(\d)\b/g, 'Creative Commons Atribuição $1 ponto $2'],
  [/\bet al\.?/g, 'e colaboradores'],
  [/\bEUA\b/g, 'Estados Unidos'],
  [/\bnº\s?/g, 'número '],
  [/\b1\s?h\b/g, '1 hora'],
  [/\b(\d+)h(\d{2})\b/g, '$1 horas e $2 minutos'],
  [/\b(\d+)\s?h\b/g, '$1 horas'],
  [/\b(\d+)\s?min\b/g, '$1 minutos'],
  [/\b(\d+)x\b/g, '$1 vezes'],
  [/\be\/ou\b/g, 'e ou'],
  // Caminhos de menu: Ajustes › Tempo de Uso, Configurações > Privacidade.
  [/\s[›>]\s/g, ', '],
  // Versões como 4.0: sem isso, a voz lê "quatro zero".
  [/\b(\d+)\.0\b/g, '$1 ponto 0'],
];

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function aplicarPronuncia(texto: string, pronuncia: Record<string, string>): string {
  let resultado = texto;
  // As chaves mais longas primeiro: leoreinaux.org antes de Reinaux.
  for (const [escrito, falado] of Object.entries(pronuncia).sort(([a], [b]) => b.length - a.length)) {
    resultado = resultado.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapar(escrito)}(?![\\p{L}\\p{N}])`, 'gu'), falado);
  }
  for (const [padrao, troca] of AJUSTES) resultado = resultado.replace(padrao, troca);
  return resultado;
}

const ENTIDADES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", mdash: '—', ndash: '–' };

/** Tira a marcação do Markdown de uma linha ou parágrafo e deixa só o que se fala. */
function limpar(texto: string): string {
  return (
    texto
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt: string) => (alt.trim() ? ` Imagem: ${alt.trim().replace(/[.!?]?$/, '.')} ` : ' '))
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
      // Chamadas de nota e de fonte: [1], [2, 3], [^1].
      .replace(/\s?\[\^[^\]]+\]/g, '')
      .replace(/\s?\[\d+(?:\s*[,–-]\s*\d+)*\]/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&(\w+);/g, (entidade, nome: string) => ENTIDADES[nome] ?? entidade)
      .replace(/`([^`]+)`/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(?<![\p{L}\p{N}])[*_](\S(?:.*?\S)?)[*_](?![\p{L}\p{N}])/gu, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\\([\\`*_{}[\]()#+\-.!|])/g, '$1')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?…)])/g, '$1')
      .trim()
  );
}

/** Garante uma pontuação no fim, para a voz baixar o tom e pausar. */
const fechar = (texto: string) => (/[.!?:;…]["”’)]?$/.test(texto) ? texto : `${texto}.`);

const celulas = (linha: string) =>
  linha
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((celula) => limpar(celula));

/**
 * Uma tabela vira uma frase por linha, com o nome de cada coluna antes do valor:
 * "Dia 1. O desafio: anotar o tempo de tela. O que ele testa: o ponto de partida."
 */
function lerTabela(linhas: string[]): string[] {
  const [cabecalho = [], ...linhasDeDados] = linhas.filter((linha) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(linha)).map(celulas);
  return linhasDeDados.map(([primeira = '', ...resto]) => {
    // Número na primeira coluna (Dia 1, Passo 2): o nome da coluna vem junto; senão, só o valor.
    const abertura = /^\d/.test(primeira) && cabecalho[0] ? `${cabecalho[0]} ${primeira}` : primeira;
    const demais = resto.map((valor, j) => (valor ? fechar(cabecalho[j + 1] ? `${cabecalho[j + 1]}: ${valor}` : valor) : '')).filter(Boolean);
    return [abertura && fechar(abertura), ...demais].filter(Boolean).join(' ');
  });
}

function blocosDoCorpo(corpo: string): { blocos: Bloco[]; temFontes: boolean } {
  const blocos: Bloco[] = [];
  let paragrafo: string[] = [];
  let temFontes = false;

  const adicionar = (texto: string, pausa: number) => {
    if (!texto) return;
    // Dois avisos iguais seguidos (duas tabelas, três blocos de código) viram um só.
    if (blocos.at(-1)?.texto === texto) return;
    blocos.push({ texto, pausa });
  };
  const fecharParagrafo = () => {
    const texto = limpar(paragrafo.join(' '));
    paragrafo = [];
    if (texto) adicionar(fechar(texto), PAUSA.paragrafo);
  };

  const linhas = corpo.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '').split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]!;

    const cerca = linha.match(/^\s*(`{3,}|~{3,})/);
    if (cerca) {
      fecharParagrafo();
      while (++i < linhas.length && !linhas[i]!.trimStart().startsWith(cerca[1]!));
      adicionar(AVISO_DE_CODIGO, PAUSA.paragrafo);
      continue;
    }
    if (SECAO_DE_FONTES.test(linha)) {
      temFontes = true;
      break;
    }
    const titulo = linha.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (titulo) {
      fecharParagrafo();
      const anterior = blocos.at(-1);
      if (anterior) anterior.pausa = Math.max(anterior.pausa, PAUSA.titulo);
      adicionar(fechar(limpar(titulo[1]!)), PAUSA.paragrafo);
      continue;
    }
    if (/^\s*\|/.test(linha)) {
      fecharParagrafo();
      const tabela = [linha];
      while (i + 1 < linhas.length && /^\s*\|/.test(linhas[i + 1]!)) tabela.push(linhas[++i]!);
      for (const texto of lerTabela(tabela)) adicionar(texto, PAUSA.item);
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(linha) || !linha.trim()) {
      fecharParagrafo();
      continue;
    }
    const item = linha.match(/^\s*(?:[-*+]|(\d+)[.)])\s+(.*)$/);
    if (item) {
      fecharParagrafo();
      const texto = limpar(item[2]!);
      if (texto) adicionar(fechar(item[1] ? `${item[1]}. ${texto}` : texto), PAUSA.item);
      continue;
    }
    paragrafo.push(linha.replace(/^\s*>\s?/, ''));
  }
  fecharParagrafo();
  // O último item de uma lista ganha a pausa de parágrafo.
  const ultimo = blocos.at(-1);
  if (ultimo) ultimo.pausa = Math.max(ultimo.pausa, PAUSA.paragrafo);
  return { blocos, temFontes };
}

/** Abertura (título, autor e resumo), corpo e fechamento (fontes, autoria e licença), prontos para a voz. */
export function narracao(entrada: EntradaDaNarracao): Narracao {
  const { titulo, resumo, corpo, autor, endereco, licenca, pronuncia } = entrada;
  const { blocos: doCorpo, temFontes } = blocosDoCorpo(corpo);
  const blocos: Bloco[] = [
    { texto: fechar(limpar(titulo)), pausa: PAUSA.paragrafo },
    { texto: `Por ${autor}.`, pausa: PAUSA.titulo },
    { texto: fechar(limpar(resumo)), pausa: PAUSA.titulo },
    ...doCorpo,
    ...(temFontes ? [{ texto: `As fontes citadas estão na versão escrita deste texto, em ${endereco}.`, pausa: PAUSA.titulo }] : []),
    {
      texto: `Você ouviu “${limpar(titulo)}”, de ${autor}. O texto completo está em ${endereco}, sob a licença ${licenca}. A narração usa uma voz sintética.`,
      pausa: 0,
    },
  ].map(({ texto, pausa }) => ({ texto: aplicarPronuncia(texto, pronuncia), pausa }));

  const hash = createHash('sha256').update(JSON.stringify(blocos)).digest('hex').slice(0, 16);
  return { blocos, hash };
}

/** O que a narração usa do site.config.ts (recebido por parâmetro, para este arquivo rodar no Node puro). */
interface ConfigDoSite {
  url: string;
  author: { name: string };
  contentLicense: { name: string };
  audio: { pronuncia: Record<string, string> };
}

/** Narração de um post ou tutorial a partir do frontmatter e do corpo em Markdown. */
export function narracaoDoTexto(texto: { title: string; summary: string; corpo: string }, site: ConfigDoSite): Narracao {
  return narracao({
    titulo: texto.title,
    resumo: texto.summary,
    corpo: texto.corpo,
    autor: site.author.name,
    endereco: new URL(site.url).host,
    licenca: site.contentLicense.name,
    pronuncia: site.audio.pronuncia,
  });
}
