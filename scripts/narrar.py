"""Sintetiza a narração de um texto com o Piper e escreve o áudio cru (PCM 16 bits, mono) na saída.

Chamado pelo scripts/audio.ts, que monta os blocos (src/lib/narracao.ts) e converte o resultado em MP3.
Entrada: o caminho do modelo .onnx no primeiro argumento e, na entrada padrão, um JSON com a lista de
blocos [{"texto": "...", "pausa": 0.6}, ...]. Cada bloco é seguido da própria pausa, em segundos, e as
frases de um mesmo bloco, de um respiro curto.

Requer o pacote piper-tts (pip install piper-tts), versão 1.5 ou mais nova.
"""

import json
import sys

from piper import PiperVoice

RESPIRO_ENTRE_FRASES = 0.25


def silencio(segundos: float, taxa: int) -> bytes:
    return b"\x00\x00" * int(segundos * taxa)


def main() -> None:
    voz = PiperVoice.load(sys.argv[1])
    taxa = voz.config.sample_rate
    blocos = json.load(sys.stdin)
    saida = sys.stdout.buffer
    for indice, bloco in enumerate(blocos, start=1):
        frases = list(voz.synthesize(bloco["texto"]))
        for posicao, frase in enumerate(frases):
            saida.write(frase.audio_int16_bytes)
            if posicao < len(frases) - 1:
                saida.write(silencio(RESPIRO_ENTRE_FRASES, taxa))
        saida.write(silencio(bloco["pausa"], taxa))
        print(f"\r  {indice}/{len(blocos)} trechos", end="", file=sys.stderr, flush=True)
    print(file=sys.stderr)


if __name__ == "__main__":
    main()
