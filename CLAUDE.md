# CLAUDE.md

Instruções para o Claude Code neste repositório.

## Fonte da verdade

Sempre consulte [`docs/arquitetura.md`](docs/arquitetura.md) antes de mudar qualquer coisa. Ele define a stack, a estrutura, o modelo de conteúdo, as metas e o roadmap. Qualquer desvio precisa ser discutido com o autor antes de ser implementado. Se algo no documento parecer errado ou desatualizado (versões, APIs), pare e avise em vez de improvisar.

## Comandos

Node.js 22.23.4 ou mais novo (Node 24 LTS em `.nvmrc`), npm.

- `npm install`: instala as dependências.
- `npm run dev`: servidor local em http://localhost:4321, com rascunhos visíveis.
- `npm run check`: `astro check` (tipos e frontmatter).
- `npm run build`: `astro check` + `astro build`, gera `dist/` sem rascunhos e, ao final, o índice da busca (`src/integrations/pagefind.ts`). Rode antes de cada commit.
- `npm run preview`: serve `dist/`. A busca só funciona aqui (ou no `wrangler dev`), porque o índice nasce no build; no `npm run dev` ela avisa que não está disponível.
- `npx wrangler dev`: serve `dist/` como na Cloudflare (URLs sem barra, 404).
- `INCLUIR_RASCUNHOS=1 npm run build` seguido de `CHROME_PATH=<caminho do Chrome> npm run qualidade`: axe-core (temas claro e escuro, celular e desktop) e Lighthouse com as metas abaixo. É o que o workflow `qualidade.yml` roda em cada PR e antes de cada deploy; uma meta que cai bloqueia o deploy. `LIGHTHOUSE_EXECUCOES=1` acelera o teste local.

## Estrutura

- `site.config.ts`: tudo o que é pessoal (nome, URL, autor e foto em `src/assets/`, redes, URL do Listmonk, repositório do código, licença dos textos). Nenhum dado pessoal fica fora dele, para que um fork só precise trocar este arquivo e a pasta de posts.
- `src/content.config.ts`: schema da coleção `posts`.
- `src/content/posts/<slug>/index.md`: um post por pasta, com capa e transcrição na mesma pasta. O nome da pasta é o slug e a URL é `/posts/<slug>`.
- `src/lib/posts.ts`: `getPublishedPosts()` (já filtra rascunhos em produção e ordena por data). Use sempre ele em vez de `getCollection('posts')`.
- `src/lib/jsonld.ts` (dados estruturados), `src/lib/og.ts` (cards sociais com Satori e resvg), `src/lib/markdown.ts` (versão Markdown dos posts) e `src/lib/images.ts` (URL absoluta de uma imagem processada).
- `src/layouts/`: `BaseLayout` (HTML base, `<head>` com canonical, Open Graph e JSON-LD, cabeçalho e rodapé) e `PostLayout`.
- `src/components/`: `Header`, `Footer`, `ThemeToggle`. Próximas etapas: `NewsletterForm`, `VideoEmbed`, `Toc`.
- `src/pages/`: `index`, `sobre`, `busca` (interface própria sobre a API do Pagefind; só o `<article>` dos posts é indexado, via `data-pagefind-body`), `404`, `posts/[slug]`, `rss.xml` (feed com o texto completo de cada post), `robots.txt`, `llms.txt`, `llms-full.txt` e `posts/[slug].md` (versão Markdown de cada post), `og.png` e `og/[slug].png` (cards sociais). O sitemap sai do `@astrojs/sitemap`, configurado em `astro.config.ts`.
- `src/styles/`: `tokens.css` (cores e espaçamentos dos dois temas), `tipografia.css`, `global.css`.
- `src/assets/fonts/`: arquivos woff2 e licença OFL das fontes; os woff estáticos da Source Sans 3 servem só para desenhar os cards sociais.
- `scripts/qualidade.ts`: verificação de acessibilidade e desempenho do `dist/`.
- `wrangler.jsonc` e `.github/workflows/deploy.yml`: publicação na Cloudflare a cada push na `main`, depois do `qualidade.yml`.

## Frontmatter dos posts

Validado no build; um erro quebra o build.

| Campo | Obrigatório | Regra |
| --- | --- | --- |
| `title` | Sim | Texto não vazio |
| `description` | Sim | Até 160 caracteres (meta description) |
| `summary` | Sim | 3 a 5 frases; aparece no topo do post e será o corpo do e-mail |
| `pubDate` | Sim | Data `AAAA-MM-DD` |
| `updatedDate` | Não | Data `AAAA-MM-DD` |
| `cover.src` | Sim | Caminho relativo para uma imagem na pasta do post |
| `cover.alt` | Sim | Descrição da imagem; não pode ficar vazio |
| `tags` | Não | Lista de textos |
| `video` | Não | `youtubeId` (11 caracteres), `duration` (ISO 8601, ex.: `PT2M10S`), `uploadDate` |
| `newsletter` | Sim | `true` dispara o e-mail no primeiro deploy do post (Etapa 3) |
| `draft` | Não | `true` mantém o post fora do build de produção |
| `social` | Não | Mapa rede → texto, reservado para a fase 2 |

Campos desconhecidos também quebram o build (schema estrito). Para mudar o schema, atualize junto a tabela em `docs/arquitetura.md`, este arquivo e o post de exemplo.

## Metas de acessibilidade

WCAG 2.2 nível AA em todo o site.

- HTML semântico (`header`, `nav`, `main`, `article`, `footer`), `lang="pt-BR"`, um único `h1` por página e títulos sem pular nível.
- Link "Pular para o conteúdo" e foco sempre visível (`:focus-visible`).
- Contraste mínimo de 4,5:1 nos textos (o corpo busca 7:1) e de 3:1 em bordas de componentes, nos dois temas. Cores novas entram só em `src/styles/tokens.css`, com o contraste conferido.
- `alt` obrigatório em todas as imagens.
- Alvos de toque de pelo menos 44 × 44 px (`--tap-target`) e respeito a `prefers-reduced-motion`.
- Todas as páginas passam `title` e `description` para o `BaseLayout`, que gera `canonical`, meta description e Open Graph. Páginas com dados estruturados passam também `jsonLd`.

## Metas de legibilidade e performance

- Corpo de 18px no mobile e 20px a partir de 48em, entrelinha 1,65 e cerca de 68 caracteres por linha (`--measure: 58ch` com a Literata). Ao trocar de fonte, meça de novo e ajuste o `--measure`.
- No máximo duas famílias de fonte OFL, servidas localmente pelo Fonts API do Astro. Nada de Google Fonts ou CDN de terceiros.
- Zero JavaScript por padrão. As exceções atuais são o script do tema (inline no `<head>` e no `ThemeToggle`) e o da página `/busca`, que carrega o Pagefind só nela (o índice baixa na primeira busca). Todo script novo precisa ser discutido antes; a meta é menos de 30 KB por página.
- LCP < 2,0 s, CLS < 0,05, INP < 200 ms e post sem vídeo com menos de 300 KB no total.
- Imagens sempre por `astro:assets` (`<Picture>`/`<Image>`), com largura e altura fixas.

## Convenções

- Textos, comentários, mensagens de commit e de interface em português (pt-BR).
- Commits pequenos e descritivos, um por passo concluído.
- Nenhum segredo no repositório: tokens ficam nos secrets do GitHub.
- Dependências só open source, com versão exata no `package.json`. Ao atualizar `esbuild` ou `workerd`, aprove de novo o script de instalação com `npm install-scripts approve <pacote>` (o npm 11 bloqueia scripts que não estão em `allowScripts`).
- O Astro 7 compacta o HTML com regras de JSX: um espaço entre elementos inline em linhas diferentes some. Use `{' '}` quando precisar dele.
