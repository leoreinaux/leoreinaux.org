/**
 * Worker da Cloudflare que só atende os MP3 da versão em áudio (/_astro/*.mp3, ver run_worker_first
 * no wrangler.jsonc). Todo o resto do site é servido direto pelos static assets, sem passar por aqui.
 *
 * Por quê: os static assets dos Workers ignoram o cabeçalho Range e sempre devolvem o arquivo inteiro
 * (200). O Safari e o iPhone pedem o áudio em trechos e precisam da resposta 206 para tocar e avançar,
 * e o Apple Podcasts exige servidor com suporte a Range. Este Worker busca o arquivo nos assets e
 * devolve só o trecho pedido, sem guardar o arquivo inteiro na memória. O tamanho total, que a
 * resposta dos assets não informa, vem de /audios.json (src/pages/audios.json.ts).
 */

/** Stream de tamanho conhecido do runtime dos Workers: faz a resposta sair com Content-Length, e não em pedaços. */
declare class FixedLengthStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor(tamanho: number);
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/** Tamanho de cada MP3, gerado no build (src/pages/audios.json.ts); lido uma vez por instância do Worker. */
let tamanhos: Promise<Record<string, number>> | undefined;

async function tamanhoDe(url: URL, env: Env): Promise<number | undefined> {
  tamanhos ??= env.ASSETS.fetch(new Request(new URL('/audios.json', url))).then((resposta) =>
    resposta.ok ? (resposta.json() as Promise<Record<string, number>>) : {},
  );
  const lista = await tamanhos;
  if (!(url.pathname in lista)) tamanhos = undefined;
  return lista[url.pathname];
}

/** Um único intervalo de bytes: "bytes=0-99", "bytes=100-" ou "bytes=-500". Vários intervalos não são atendidos. */
function intervalo(cabecalho: string, total: number): { inicio: number; fim: number } | 'invalido' | undefined {
  const partes = cabecalho.match(/^bytes=(\d*)-(\d*)$/);
  if (!partes) return undefined;
  const [, a = '', b = ''] = partes;
  if (!a && !b) return undefined;
  let inicio: number;
  let fim: number;
  if (!a) {
    // Os últimos N bytes.
    inicio = Math.max(total - Number(b), 0);
    fim = total - 1;
  } else {
    inicio = Number(a);
    fim = b ? Math.min(Number(b), total - 1) : total - 1;
  }
  return inicio > fim || inicio >= total ? 'invalido' : { inicio, fim };
}

/** Repassa só os bytes de inicio a fim (inclusive) do corpo, à medida que eles chegam. */
function fatiar(corpo: ReadableStream<Uint8Array>, inicio: number, fim: number): ReadableStream<Uint8Array> {
  let posicao = 0;
  return corpo.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(pedaco, saida) {
        const de = Math.max(inicio - posicao, 0);
        const ate = Math.min(fim + 1 - posicao, pedaco.length);
        if (de < ate) saida.enqueue(pedaco.subarray(de, ate));
        posicao += pedaco.length;
        if (posicao > fim) saida.terminate();
      },
    }),
  ).pipeThrough(new FixedLengthStream(fim - inicio + 1));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const resposta = await env.ASSETS.fetch(request);
    const cabecalhos = new Headers(resposta.headers);
    cabecalhos.set('Accept-Ranges', 'bytes');

    const pedido = request.headers.get('Range');
    // A resposta dos static assets não traz o Content-Length; o tamanho vem da lista do build.
    const total = Number(resposta.headers.get('Content-Length')) || (await tamanhoDe(new URL(request.url), env)) || 0;
    if (resposta.status !== 200 || total <= 0) {
      return new Response(resposta.body, { status: resposta.status, statusText: resposta.statusText, headers: cabecalhos });
    }
    // Arquivo inteiro (ou HEAD): o mesmo conteúdo, agora com o tamanho declarado.
    const inteiro = () => {
      cabecalhos.set('Content-Length', String(total));
      return new Response(resposta.body?.pipeThrough(new FixedLengthStream(total)) ?? null, { status: 200, headers: cabecalhos });
    };
    if (!pedido || !resposta.body) return inteiro();

    const trecho = intervalo(pedido, total);
    if (trecho === 'invalido') {
      await resposta.body.cancel();
      cabecalhos.set('Content-Range', `bytes */${total}`);
      cabecalhos.delete('Content-Length');
      return new Response(null, { status: 416, headers: cabecalhos });
    }
    if (!trecho) return inteiro();

    cabecalhos.set('Content-Range', `bytes ${trecho.inicio}-${trecho.fim}/${total}`);
    cabecalhos.set('Content-Length', String(trecho.fim - trecho.inicio + 1));
    return new Response(fatiar(resposta.body, trecho.inicio, trecho.fim), { status: 206, headers: cabecalhos });
  },
};
