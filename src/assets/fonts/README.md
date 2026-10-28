# Fontes

Arquivos woff2 variáveis (eixo de peso), só o subconjunto latino, que cobre todo o português. Origem: pacotes do [Fontsource](https://fontsource.org), copiados para cá para que o build não dependa de nenhum serviço externo.

| Família | Uso | Versão (Fontsource) | Licença |
| --- | --- | --- | --- |
| [Literata](https://github.com/googlefonts/literata) | Corpo do texto | @fontsource-variable/literata 5.3.0 | SIL OFL 1.1 (`literata/OFL.txt`) |
| [Source Sans 3](https://github.com/adobe-fonts/source-sans) | Títulos e interface | @fontsource-variable/source-sans-3 5.3.1 | SIL OFL 1.1 (`source-sans-3/OFL.txt`) |

Os arquivos `source-sans-3-latin-400-normal.woff` e `-700-normal.woff` vêm do pacote estático `@fontsource/source-sans-3` 5.3.1 e só são usados no build, para desenhar os cards sociais (`src/lib/og.ts`): o Satori não lê woff2 nem fontes variáveis.

As famílias são registradas em `astro.config.ts` (Fonts API, provider `local`) e carregadas no `BaseLayout`.
