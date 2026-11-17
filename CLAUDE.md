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
- `npm run audio`: gera o áudio (`audio.mp3` e `audio.json`) dos posts e tutoriais publicados que mudaram; `npm run audio -- <slug>` gera só os textos indicados (inclusive rascunhos), `AUDIO_SIMULAR=1` mostra o texto que seria lido e `AUDIO_FORCAR=1` gera de novo mesmo sem mudança. Requer Python 3 com `piper-tts`, a voz de `site.audio.voz` (`python3 -m piper.download_voices pt_BR-faber-medium --data-dir ~/.local/share/piper`) e ffmpeg; `PIPER_PYTHON` e `PIPER_VOZES` trocam o Python e a pasta das vozes. Rode depois de mudar o texto de um post publicado e faça o commit dos arquivos; o build avisa (`[audio]`) quando um áudio ficou desatualizado.
- `INCLUIR_RASCUNHOS=1 npm run build` seguido de `CHROME_PATH=<caminho do Chrome> npm run qualidade`: axe-core (temas claro e escuro, celular e desktop) e Lighthouse com as metas abaixo. É o que o workflow `qualidade.yml` roda em cada PR e antes de cada deploy; uma meta que cai bloqueia o deploy. `LIGHTHOUSE_EXECUCOES=1` acelera o teste local.

## Estrutura

- `site.config.ts`: tudo o que é pessoal (nome, URL, autor e foto em `src/assets/`, redes, URL do Listmonk, URL e ID do site no Umami, repositório do código, licença dos textos, e-mail de privacidade, chave do IndexNow, voz e pronúncias do áudio). Nenhum dado pessoal fica fora dele, para que um fork só precise trocar este arquivo e a pasta de posts.
- `src/content.config.ts`: schema das coleções `posts` e `tutoriais`. Os tutoriais usam o mesmo schema dos posts, sem o campo `newsletter` (tutorial nunca vira e-mail).
- `src/content/tutoriais/<slug>/index.md`: um tutorial por pasta, com a mesma estrutura dos posts. A URL é `/tutoriais/<slug>`, a listagem fica em `/tutoriais` (item do menu) e eles não entram na lista "Textos" da home. Vídeo, transcrição, versão Markdown, busca, RSS, `llms.txt`, sitemap e IndexNow funcionam como nos posts.
- `src/content/posts/<slug>/index.md`: um post por pasta, com capa e transcrição na mesma pasta. A transcrição do vídeo, se houver, fica em `transcricao.md` (Markdown puro, sem frontmatter) e aparece num bloco recolhível abaixo do player, no JSON-LD e na versão Markdown. O nome da pasta é o slug e a URL é `/posts/<slug>`. A versão em áudio fica em `audio.mp3` e `audio.json` (duração, tamanho, voz e impressão digital do texto narrado), gerados por `npm run audio`; com `"gravacao": true` no `audio.json`, o `audio.mp3` é uma gravação do autor, que o script não sobrescreve.
- `src/integrations/`: `pagefind.ts` (índice da busca) e `csp.ts`, que soma à Content-Security-Policy de cada página o hash dos scripts `is:inline` (o Astro só calcula o dos scripts que processa). A CSP sai numa `<meta>` (`security.csp` em `astro.config.ts`); uma origem externa nova (script, iframe, formulário, `fetch`) precisa entrar ali.
- `public/_headers`: cabeçalhos de segurança de todas as respostas na Cloudflare (HSTS, `frame-ancestors`, `nosniff`, Referrer-Policy, Permissions-Policy). O domínio está na lista de pré-carregamento do HSTS (hstspreload.org): mantenha `max-age` de pelo menos um ano, `includeSubDomains` e `preload`, e todo subdomínio novo precisa servir HTTPS. O redirecionamento de `http://` para `https://` é o *Always Use HTTPS* da Cloudflare (*SSL/TLS → Edge Certificates*); o HSTS da Cloudflare, na mesma tela, fica desligado, para o cabeçalho sair só daqui.
- `src/lib/posts.ts`: `getPublishedPosts()`, `getPublishedTutoriais()` e `getPublishedTextos()` (os dois juntos), que já filtram rascunhos em produção e ordenam por data. Use sempre eles em vez de `getCollection()`. O tipo `Post` vale para posts e tutoriais, e `postUrl()` monta `/posts/<slug>` ou `/tutoriais/<slug>`. Também `tempoDeLeitura()` (200 palavras por minuto), exibido ao lado da data e no JSON-LD.
- `src/lib/jsonld.ts` (dados estruturados), `src/lib/og.ts` (card social padrão com Satori e resvg), `src/lib/markdown.ts` (versão Markdown dos posts), `src/lib/images.ts` (URL absoluta de uma imagem processada e da capa no formato do card social), `src/lib/links.ts` (links externos em nova aba), `src/lib/tabelas.ts` (tabelas dos posts numa região rolável, para o celular), `src/lib/video.ts` (miniatura do YouTube baixada no build, transcrição e duração), `src/lib/narracao.ts` (texto que a voz lê: Markdown sem links, fontes e código, tabelas linha a linha e pronúncias; sem dependências do Astro, porque roda também no `scripts/audio.ts`) e `src/lib/audio.ts` (MP3 e `audio.json` de cada texto, com o aviso de áudio desatualizado).
- `src/layouts/`: `BaseLayout` (HTML base, `<head>` com canonical, Open Graph e JSON-LD, cabeçalho e rodapé) e `PostLayout`.
- `src/components/`: `Header`, `ListaPosts` (lista de textos da home e de `/tutoriais`), `Footer` (com o link do feed RSS), `ThemeToggle`, `Analytics` (script do Umami no `<head>`; só entra com `analytics.websiteId` preenchido), `NewsletterForm` (inscrição sem JavaScript, enviada direto ao Listmonk, com o link do feed RSS logo abaixo; só aparece com `newsletter.listUuid` preenchido) `AudioPlayer` (versão em áudio abaixo do resumo, com `<audio controls preload="none">` nativo e link para baixar o MP3), `VideoEmbed` (miniatura servida pelo site e player de `youtube-nocookie.com` só no clique) `Compartilhar` (antes do formulário da newsletter na home e nos posts: links diretos para WhatsApp, Facebook, LinkedIn, X, Bluesky, Threads e e-mail, nessa ordem de uso no Brasil, com `utm_source` da rede, `utm_medium=social` (`email` no e-mail) e `utm_campaign=compartilhar`; mais "Copiar link" e o menu nativo do sistema com JavaScript) e `Toc` (sumário "Neste texto", com os subtítulos de nível 2 e 3; só aparece com pelo menos três subtítulos de nível 2).
- `src/pages/`: `index`, `tutoriais/index` (lista dos tutoriais), `tutoriais/[slug]` e `tutoriais/[slug].md`, `sobre`, `newsletter` (o que chega, quando e como cancelar, com o formulário ou o aviso de "em breve"), `privacidade` (política de privacidade; atualize a data no topo a cada mudança e mantenha o texto fiel às configurações de `infra/`), `indexnow.txt` (chave do IndexNow), `busca` (interface própria sobre a API do Pagefind; só o `<article>` dos posts é indexado, via `data-pagefind-body`), `404`, `posts/[slug]`, `rss.xml` (feed com o texto completo de cada post e tutorial), `robots.txt`, `llms.txt`, `llms-full.txt` e `posts/[slug].md` (versão Markdown de cada post), `og.png` (card social das páginas que não são posts; nos posts, o card é a capa recortada em 1200×630, ver `ogImageUrl` em `src/lib/images.ts`), `newsletter.json` (posts para o `scripts/newsletter.ts`). O sitemap sai do `@astrojs/sitemap`, configurado em `astro.config.ts`.
- `src/styles/`: `tokens.css` (cores e espaçamentos dos dois temas), `tipografia.css`, `global.css` (inclui `.rotulo`, `.campo-texto` e `.botao`, usados pelos formulários).
- `src/assets/fonts/`: arquivos woff2 e licença OFL das fontes; os woff estáticos da Source Sans 3 servem só para desenhar os cards sociais.
- `scripts/qualidade.ts`: verificação de acessibilidade e desempenho do `dist/`.
- `scripts/audio.ts` e `scripts/narrar.py`: versão em áudio com o Piper (voz sintética local, open source). O `audio.ts` monta o texto (`src/lib/narracao.ts`), o `narrar.py` sintetiza com as pausas e o ffmpeg converte em MP3 mono de 48 kbps com volume normalizado. Nenhum serviço externo; só roda no computador de quem publica, nunca no CI.
- `scripts/indexnow.ts`: depois do deploy, avisa os buscadores pelo IndexNow dos posts e tutoriais que mudaram desde o último deploy publicado, cujo commit o `deploy.yml` busca na API do GitHub Actions (chave pública em `site.config.ts`, servida em `/indexnow.txt`). `BASE_SHA=<commit> INDEXNOW_SIMULAR=1 node scripts/indexnow.ts` mostra o que seria enviado.
- `scripts/newsletter.ts`: depois do deploy, cria e agenda no Listmonk a campanha de cada post novo com `newsletter: true` (às `newsletter.sendTime` do dia seguinte), a partir do `/newsletter.json` (`src/pages/newsletter.json.ts`). Precisa dos secrets `LISTMONK_API_USER` e `LISTMONK_API_TOKEN`; sem eles, não faz nada. `NEWSLETTER_SIMULAR=1` mostra o que faria.
- `infra/`: VPS da newsletter e do analytics (Docker Compose com Caddy, Listmonk, Umami e PostgreSQL, mais `backup.sh` com restic). Versões exatas das imagens; passo a passo e manutenção em `infra/README.md`.
- `.github/dependabot.yml`: PRs semanais de atualização de npm, actions e imagens Docker. As actions ficam fixadas por SHA, com a versão num comentário.
- `wrangler.jsonc` e `.github/workflows/deploy.yml`: publicação na Cloudflare a cada push na `main`, depois do `qualidade.yml`.

## Frontmatter dos posts e tutoriais

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
| `newsletter` | Sim (só posts) | `true` dispara o e-mail no primeiro deploy do post (Etapa 3); não existe nos tutoriais |
| `draft` | Não | `true` mantém o post fora do build de produção |
| `social` | Não | Mapa rede → texto, reservado para a fase 2 |

Campos desconhecidos também quebram o build (schema estrito). Para mudar o schema, atualize junto a tabela em `docs/arquitetura.md`, este arquivo e os exemplos (`src/content/posts/exemplo/` e `src/content/tutoriais/exemplo/`).

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
- Zero JavaScript por padrão. As exceções atuais são o script do tema (inline no `<head>` e no `ThemeToggle`), o da página `/busca`, que carrega o Pagefind só nela (o índice baixa na primeira busca), e o do `VideoEmbed`, só em posts com vídeo, que troca a miniatura pelo player no clique (sem ele, o link abre o vídeo no YouTube), o do `Compartilhar` (inline, logo depois da lista, para mostrar "Copiar link" e "Mais opções" antes do primeiro desenho; sem ele, ficam só os links das redes) e o do Umami (`Analytics`, com `defer`, servido pela VPS). Todo script novo precisa ser discutido antes; a meta é menos de 30 KB por página.
- LCP < 2,0 s, CLS < 0,05, INP < 200 ms e post sem vídeo com menos de 300 KB no total.
- Imagens sempre por `astro:assets` (`<Picture>`/`<Image>`), com largura e altura fixas.

## Convenções

- Textos, comentários, mensagens de commit e de interface em português (pt-BR).
- Commits pequenos e descritivos, um por passo concluído.
- Nenhum segredo no repositório: tokens ficam nos secrets do ambiente `producao` do GitHub (*Settings → Environments*), restrito à `main` e usado só pelo job `deploy` do `deploy.yml`.
- Dependências só open source, com versão exata no `package.json`. Ao atualizar `esbuild` ou `workerd`, aprove de novo o script de instalação com `npm install-scripts approve <pacote>` (o npm 11 bloqueia scripts que não estão em `allowScripts`).
- Links externos abrem em nova aba, com o aviso "abre em nova aba" para leitores de tela (`aria-describedby`, ver `src/lib/links.ts`). Nos posts em Markdown, o plugin `linksExternos` cuida disso; nos componentes `.astro`, use `{...externo()}` no `<a>` (ou `{...externo('me')}` para somar ao `rel`).
- O `satteri` (só para o `defineHastPlugin` e os tipos de `src/lib/links.ts`) fica na versão que o `@astrojs/markdown-satteri` pede; ao atualizar este, atualize aquele junto. O Dependabot ignora o `satteri`.
- O `typescript` fica na versão major que o `@astrojs/check` aceita (hoje até a 6); o Dependabot não propõe versões major dele, que entram junto com um `@astrojs/check` compatível.
- O `fflate` fica fixado na 0.8.3 por um `overrides` no `package.json`, porque o `satori` 0.63.2 fixa a 0.7.3, que tem um alerta de segurança. Quando um `satori` novo já trouxer o `fflate` 0.8 ou mais novo, tire o `overrides` e confira se o `og.png` continua igual.
- O Astro 7 compacta o HTML com regras de JSX: um espaço entre elementos inline em linhas diferentes some. Use `{' '}` quando precisar dele.
