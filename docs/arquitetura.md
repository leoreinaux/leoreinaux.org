# leoreinaux.org — Documento de Arquitetura

Oct 26, 2026 · @Leandro Reinaux

## Contexto e objetivos

O leoreinaux.org é um site pessoal, sem fins lucrativos, para publicar textos longos e aprofundados em português, com uma newsletter que avisa os inscritos a cada novo post. O código do site será aberto para que qualquer pessoa possa reutilizar a mesma base.

Requisitos de partida:

- 100% tecnologia open source
- Custo mínimo de operação
- Otimização para SEO (buscadores), AEO (motores de resposta) e GEO (IAs generativas)
- Legibilidade e acessibilidade no mobile e no desktop
- Captura de e-mails e envio automático de novos posts

| Tema | Decisão |
| --- | --- |
| Infraestrutura | Código e ferramentas open source; site em hospedagem estática gratuita; uma VPS pequena só para a newsletter |
| Edição | Arquivos Markdown no repositório, publicados por commit (editor ou Claude Code) |
| Idioma | Somente português (pt-BR) |
| Recursos extras | Busca no site, analytics sem cookies, vídeos com transcrição |
| Newsletter | E-mail com resumo + link para o texto completo no site; até 1 mil inscritos no 1º ano |
| Licenças | Código em MIT; textos em CC BY 4.0 |
| Redes sociais | Automação fica para a fase 2, mas a arquitetura já nasce preparada |

Fora da v1: comentários, versão bilíngue e painel de edição web.

## Visão geral da arquitetura

O site é estático e fica na CDN da Cloudflare; só newsletter e analytics precisam de servidor, numa VPS pequena. Publicar é um commit: o GitHub Actions gera o site, publica e cria a campanha de e-mail.

&#91;embedded content: arquitetura · site na CDN, newsletter e analytics na VPS\]

O leitor nunca depende da VPS para ler um texto: ela só recebe inscrições, métricas anônimas e comandos de envio, então uma queda dela não tira o site do ar.

## Stack escolhida

Todo o software é open source; os serviços externos (CDN, envio de e-mail, repositório) são gratuitos ou custam centavos e podem ser trocados sem reescrever código. O princípio é portabilidade: o build gera arquivos estáticos que rodam em qualquer host, e o Listmonk envia por SMTP para qualquer provedor.

| Camada | Escolha | Licença | Por quê | Alternativa |
| --- | --- | --- | --- | --- |
| Gerador do site | [Astro 7](https://github.com/withastro/astro/blob/main/packages/astro/CHANGELOG.md) | MIT | HTML estático com zero JavaScript por padrão; coleções de conteúdo validam o frontmatter de cada post | Eleventy, Hugo |
| Hospedagem do site | [Cloudflare Workers com static assets](https://flaviocopes.com/cloudflare-pages-vs-workers/) | Serviço gratuito | Arquivos estáticos servidos sem custo e sem limite de banda; CDN global | GitHub Pages, Netlify |
| DNS | Cloudflare | Serviço gratuito | Mesmo painel do site; proteção contra abuso no subdomínio da newsletter | Registrador atual |
| Newsletter | [Listmonk v6](https://github.com/knadh/listmonk) | AGPL-3.0 | Binário único em Go + PostgreSQL; double opt-in por lista, API e templates | Ghost (mais pesado) |
| Envio de e-mail | [Amazon SES, plano Essentials](https://dev.to/mr_manushukla/amazon-ses-pricing-plans-in-2026-essentials-vs-pro-vs-enterprise-and-when-a-la-carte-still-wins-1ohg) | Serviço pago por uso | US$ 0,16 por mil e-mails, sem taxa fixa | Brevo, Resend |
| Busca | [Pagefind 1.5](https://github.com/Pagefind/pagefind) | MIT | Índice gerado no build e consultado no navegador, sem servidor; interface própria (~1,4 KB) sobre a API, em vez da UI pronta (~43 KB) | — |
| Analytics | [Umami v3](https://heise.de/-11069615) | MIT | Sem cookies; usa o mesmo PostgreSQL do Listmonk | Plausible CE |
| Servidor | VPS + Docker Compose + Caddy | Apache-2.0 (Caddy) | HTTPS automático para os dois serviços (`newsletter.leoreinaux.org` e `analytics.leoreinaux.org`); passo a passo em `infra/README.md` | — |
| CI/CD | GitHub Actions | Gratuito em repositório público | Build, testes, deploy e disparo da newsletter | Forgejo Actions (Codeberg) |
| Vídeo | YouTube + embed leve (lite-youtube) | Apache-2.0 (embed) | Alcance do YouTube sem pesar a página | PeerTube |

**Sobre o Astro.** Em janeiro de 2026 a Cloudflare comprou a empresa que mantém o Astro, que segue [MIT, com governança aberta e suporte a vários hosts](https://www.heise.de/en/news/Web-Development-Cloudflare-Acquires-Astro-Technology-Company-11145912.html?view=print). O risco é baixo: como o site é estático, trocar de host é trocar o comando de deploy.

**Versão do Astro.** O projeto começou na 7.4.2 (out/2026), a estável mais recente; a 7.0 saiu em junho de 2026 e a linha 6 parou na 6.4.8. A 7 exige Node 22.23.4 ou mais novo; o CI usa o Node 24 LTS. Mudanças da 7 que afetam o site: o Markdown passa a ser processado pelo Sätteri (pipeline nativo, no lugar de remark/rehype) e o HTML é compactado com regras de JSX por padrão.

**Workers em vez de Pages.** A própria Cloudflare orienta novos projetos a usar Workers com static assets, onde chegam os recursos novos. Para um site estático o custo é o mesmo: zero.

**SES em vez de um plano gratuito.** Os planos grátis não cabem num disparo para 1 mil pessoas: o [Brevo envia 300 por dia](https://help.brevo.com/hc/en-us/articles/208580669) e põe a marca dele no e-mail; o Resend, 100 por dia. No SES, 1 mil inscritos × 4 posts por mês = 4 mil e-mails ≈ US$ 0,64. O antigo free tier do SES acabou para contas novas em julho de 2026.

**VPS.** Ela só hospeda newsletter e analytics, então 2 vCPU e 4 GB bastam. A Hetzner subiu preços duas vezes em 2026 e o [CX23 foi para €5,49](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do); planos baratos às vezes aparecem indisponíveis. Orçamento: €6 a €8 por mês, em qualquer provedor (Hetzner, Netcup, Contabo).

## Estrutura do repositório e modelo de conteúdo

Um único repositório guarda site, conteúdo, scripts e infraestrutura da VPS. Cada post é uma pasta com o texto, as imagens e a transcrição do vídeo, para que tudo de um tema viaje junto.

```text
leoreinaux.org/
├── src/
│   ├── content/posts/
│   │   └── tecnologia-brasileira/
│   │       ├── index.md          # texto + frontmatter
│   │       ├── capa.jpg
│   │       └── transcricao.md    # opcional
│   ├── components/   # Header, NewsletterForm, VideoEmbed, Toc...
│   ├── layouts/      # BaseLayout, PostLayout
│   ├── pages/        # index, sobre, posts/[slug], busca, rss.xml, llms.txt, robots.txt
│   └── styles/       # tokens, tipografia, temas claro/escuro
├── public/           # favicon
├── scripts/          # newsletter.ts, indexnow.ts
├── infra/            # docker-compose.yml, Caddyfile, backup.sh
├── .github/workflows/  # deploy.yml, qualidade.yml
├── site.config.ts    # nome, URL, autor, redes, URL do Listmonk
├── CLAUDE.md         # instruções para o Claude Code
├── LICENSE           # MIT (código)
└── LICENSE-CONTENT   # CC BY 4.0 (textos)
```

O `site.config.ts` concentra tudo o que é pessoal. Quem fizer um fork troca esse arquivo e a pasta de posts, e o resto funciona.

O frontmatter de cada post é validado no build; um campo obrigatório ausente quebra o build em vez de ir para o ar.

| Campo | Obrigatório | Uso |
| --- | --- | --- |
| `title` | Sim | Título da página, do e-mail e do card social |
| `description` | Sim | Meta description, até 160 caracteres |
| `summary` | Sim | Resumo de 3 a 5 frases no topo do post; vira o corpo do e-mail |
| `pubDate` / `updatedDate` | Sim / Não | Datas visíveis na página e no JSON-LD |
| `cover` (`src`, `alt`) | Sim | Imagem de capa; `alt` é obrigatório |
| `tags` | Não | Agrupamento e páginas por tema |
| `video` (`youtubeId`, `duration`, `uploadDate`) | Não | Embed e dados estruturados do vídeo |
| `newsletter` | Sim | `true` dispara o e-mail no primeiro deploy do post |
| `draft` | Não | `true` mantém fora do build de produção |
| `social` | Não | Reservado para a fase 2 (trechos para cada rede) |

## SEO, AEO e GEO

Os três se apoiam na mesma base: HTML estático e semântico, rápido, com autor identificável e dados estruturados. Buscadores, motores de resposta e IAs generativas leem o mesmo HTML; o que muda é o quanto cada um depende de trechos citáveis e de metadados limpos.

**Fundação técnica (SEO)**

- URLs curtas em português, sem data: `/posts/tecnologia-brasileira`
- `<html lang="pt-BR">`, `<link rel="canonical">` em todas as páginas e título único por página
- Sitemap gerado no build (`@astrojs/sitemap`) e feed RSS completo (`@astrojs/rss`)
- Open Graph e cards sociais: nos posts, a própria capa, recortada no build em um JPEG de 1200×630 (o mesmo que aparece no WhatsApp, LinkedIn e X). As páginas que não são posts usam um card padrão em PNG, com a descrição do site sobre o fundo, desenhado pelo [Satori](https://github.com/vercel/satori) e convertido pelo [resvg-js](https://github.com/thx/resvg-js) (ambos MPL-2.0), com a Source Sans 3 em woff estático (o Satori não lê woff2)
- Ping via IndexNow a cada deploy, para Bing e outros buscadores indexarem em minutos (`scripts/indexnow.ts`): só os posts publicados ou retirados desde o deploy anterior, mais a home. A chave é pública, fica no `site.config.ts` e é servida em `/indexnow.txt`
- Cadastro no Google Search Console e no Bing Webmaster Tools; o índice do Bing alimenta respostas de vários assistentes

**Dados estruturados (JSON-LD)**

| Tipo | Onde | Campos que importam |
| --- | --- | --- |
| `Person` | Página Sobre (dentro de um `ProfilePage`), home e como autor de cada post | Nome, cargo, foto, `sameAs` com LinkedIn e Instagram |
| `WebSite` | Home | Nome, URL, busca interna (`SearchAction` para `/busca?q=`) |
| `BlogPosting` | Cada post | Título, resumo, autor, `datePublished`, `dateModified`, imagem, `license` (CC BY 4.0) |
| `VideoObject` | Posts com vídeo | Nome, duração, miniatura, `uploadDate`, `embedUrl`, `transcript` |
| `BreadcrumbList` | Posts | Início › título, enquanto não houver uma página que liste os posts |

**Escrita que vira resposta (AEO)**

- O primeiro parágrafo responde à pergunta central do texto; o `summary` aparece logo abaixo do título como caixa de resumo
- Subtítulos em forma de pergunta quando fizer sentido, cada um seguido de uma resposta direta em 1 ou 2 frases
- Fontes citadas com link, datas de publicação e atualização visíveis, bio do autor no fim do post

**Leitura por IAs (GEO)**

- `robots.txt` gerado no build, liberando explicitamente os crawlers de busca de IA (OAI-SearchBot, Claude-SearchBot, PerplexityBot) e os de treinamento (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended)
- `/llms.txt` gerado no build com a descrição do site e a lista de posts, e `/llms-full.txt` com o texto completo; [Anthropic e Perplexity declaram suporte](https://seocom.agency/en/resources/seo-dictionary/llms-txt/), os demais ainda não. Custo de implementação é quase zero
- Cada post também disponível em Markdown puro (`/posts/tecnologia-brasileira.md`), mais fácil de ler por modelos
- A licença CC BY 4.0 declarada no JSON-LD deixa explícito que citar e reproduzir com crédito é permitido

Nada disso compensa texto fraco: a otimização serve para que um texto bom seja encontrado e citado com o crédito certo.

## Legibilidade, acessibilidade e performance

A meta é WCAG 2.2 nível AA em todo o site e leitura confortável de textos longos em qualquer tela, verificadas automaticamente a cada deploy. Um texto de 15 minutos precisa ser agradável no celular, que deve ser a maior parte do tráfego vindo de Instagram e LinkedIn.

**Tipografia de leitura**

- Corpo de texto em 18 px no mobile e 20 px no desktop, entrelinha 1,6 a 1,7
- Largura da coluna limitada a cerca de 68 caracteres por linha (`max-width: 58ch` com a Literata; o valor em `ch` depende da fonte, porque mede a largura do "0")
- No máximo duas famílias de fonte com licença aberta (SIL OFL), servidas pelo próprio site em woff2 pelo Fonts API do Astro (estável desde a versão 6), sem Google Fonts
- Hierarquia clara de títulos, citações e notas de rodapé estilizadas, folha de estilo para impressão

**Conforto em textos longos**

- Sumário do post: fixo na lateral no desktop, recolhível no topo no mobile
- Tempo de leitura estimado e caixa de resumo no início
- Tema claro e escuro conforme o sistema, com botão para trocar

**Acessibilidade**

- HTML semântico (`header`, `main`, `article`, `nav`), link "pular para o conteúdo" e foco visível
- Contraste mínimo de 4,5:1 nos textos (buscar 7:1 no corpo), nos dois temas
- `alt` obrigatório nas imagens, validado no frontmatter e em lint do Markdown
- Alvos de toque de pelo menos 44 × 44 px e respeito a `prefers-reduced-motion`
- Vídeos com legenda e transcrição em texto

**Metas de performance (celular intermediário em 4G)**

| Métrica | Meta |
| --- | --- |
| LCP (maior elemento visível) | < 2,0 s |
| CLS (deslocamento de layout) | < 0,05 |
| INP (resposta a interações) | < 200 ms |
| JavaScript por página | < 30 KB; a busca carrega só quando aberta; o script do Umami (≈ 2 KB, com `defer`) entra em todas as páginas |
| Peso total de um post sem vídeo | < 300 KB |

Imagens passam pelo `astro:assets` (AVIF/WebP, tamanhos responsivos, largura e altura fixas). O workflow de qualidade (`scripts/qualidade.ts`) roda o axe-core e o Lighthouse, ambos open source, e bloqueia o deploy se alguma meta cair. O axe-core testa cada página nos temas claro e escuro, no celular e no desktop; o Lighthouse mede a mediana de três execuções no celular em 4G simulado, com o TBT no lugar do INP, que não se mede em laboratório. O Lighthouse é usado direto pela API Node em vez do Lighthouse CI, parado desde junho de 2025 na versão 12 do Lighthouse e com dependências vulneráveis. O build do teste inclui os rascunhos, para que a página de post seja testada desde o início.

## Newsletter

O Listmonk roda em `newsletter.leoreinaux.org`, recebe as inscrições com confirmação por e-mail e envia cada novo post automaticamente pelo SES, sem passo manual além do commit.

**Captura de inscritos**

1. Formulário no fim de cada post, na home e na página `/newsletter` (que explica o que chega, quando e como cancelar), com e-mail, nome opcional e caixa de consentimento com link para a política de privacidade.
2. O formulário funciona sem JavaScript, com envio direto para o endpoint de inscrição do Listmonk, que responde com a própria página ("confira o seu e-mail"), com o visual do site (`infra/listmonk/publico.css`). A versão com JavaScript, que mostraria a confirmação na página do post pela [API pública de inscrição](https://forge.dmz.skyfritt.net/stopplidelsen/innhold/src/branch/latest/docs/newsletter-plugin.md), ficou de fora por decisão do autor: o ganho é pequeno diante de um script novo e da liberação de CORS no Caddy, que o Listmonk 6.2 não oferece. Pode voltar se a saída do site atrapalhar na prática.
3. A lista é double opt-in: a pessoa só vira inscrita depois de clicar no link de confirmação.
4. Contra spam: double opt-in, um campo isca oculto e [limite de requisições no Caddy](https://www.ssdnodes.com/learn/stop-subscription-bombing-signups). O hCaptcha fica de fora por ser proprietário.

**Envio de um novo post**

1. Um commit adiciona um post com `newsletter: true` na branch principal.
2. O workflow de deploy gera e publica o site.
3. Com o deploy concluído, `scripts/newsletter.ts` lê o `/newsletter.json` gerado no build e pergunta à API do Listmonk se já existe campanha com a tag `post:<slug>`; o script é idempotente, não guarda estado no repositório e só considera posts publicados nos últimos 7 dias.
4. Se não existe, cria a campanha com o template "novo post" (`infra/listmonk/novo-post.html`, que o script mantém sincronizado): título, capa em JPEG, `summary` e um botão "Ler no site", com versão em texto puro.
5. A campanha é agendada para as 7h (horário de Brasília) do dia seguinte, janela para revisar ou cancelar no painel.
6. O Listmonk envia pelo SES em ritmo controlado, com cabeçalho de descadastro em um clique.

**Entregabilidade**

- SPF, DKIM e DMARC configurados para o domínio de envio (`news.leoreinaux.org`, no SES da região de Ohio, `us-east-2`), com MAIL FROM próprio no SES; passo a passo em `infra/ses.md`
- Bounces e reclamações voltam do SES para o Listmonk, que remove endereços problemáticos sozinho
- Contas novas do SES começam em sandbox; é preciso pedir acesso de produção antes do lançamento
- E-mail com versão em texto puro e HTML simples, sem imagens pesadas

**LGPD**

- Finalidade clara no formulário e política de privacidade publicada em `/privacidade`, com o contato `privacyEmail` do `site.config.ts`
- Data e origem da confirmação registradas pelo Listmonk
- Descadastro em todo e-mail; exportação e exclusão dos dados de um inscrito pelo painel
- O Umami não usa cookies, então o site dispensa banner de consentimento
- O script do Umami vem da própria VPS (`analytics.leoreinaux.org`), conta só visitas no domínio do site e não registra o que vem depois do "?" na URL, como os termos da busca

## Vídeos com transcrição

O vídeo de 1min30 a 2min30 fica hospedado no YouTube, onde ele já será publicado, e entra no post como uma miniatura leve que só carrega o player ao clicar. A transcrição vai para a página como texto, que é o que buscadores e IAs conseguem ler.

- **Embed leve.** O componente `VideoEmbed` usa o padrão lite-youtube: mostra a miniatura e o botão de play e só carrega o iframe (via `youtube-nocookie.com`) quando a pessoa clica. Evita centenas de KB de JavaScript do YouTube em cada visita e não grava cookies antes do clique. Em vez da biblioteca `lite-youtube-embed`, que busca a miniatura nos servidores do Google ao abrir a página, a miniatura é baixada no build e servida pelo próprio site, e um script de poucas linhas troca o link pelo player; sem JavaScript, o link abre o vídeo no YouTube. Se a miniatura não puder ser baixada, o build segue com um fundo neutro.
- **Transcrição.** Gerada localmente com Whisper (open source, MIT), revisada e salva em `transcricao.md` na pasta do post. Aparece num bloco recolhível "Transcrição do vídeo" logo abaixo do player, e o texto entra no HTML e no índice da busca.
- **Legendas.** O mesmo Whisper gera o arquivo `.vtt`, enviado ao YouTube como legenda em português.
- **Dados estruturados.** `VideoObject` no JSON-LD com duração, miniatura, data de upload e a transcrição.
- **Sem vídeo, sem custo.** Hospedar vídeo 4K por conta própria custaria banda e armazenamento; o YouTube resolve isso de graça e ainda é uma das redes de distribuição. PeerTube fica como alternativa 100% aberta, se um dia fizer sentido.

## Custos estimados

O custo total fica em torno de R$ 45 a R$ 60 por mês, quase todo na VPS. Tráfego no site não aumenta a conta; só o número de inscritos mexe no custo de envio. Valores em reais são aproximados, pelo câmbio de outubro de 2026.

| Item | Serviço | Custo mensal | Custo anual |
| --- | --- | --- | --- |
| VPS (Listmonk, Umami, PostgreSQL) | 2 vCPU, 4 GB | €6 a €8 (≈ R$ 40 a 55) | ≈ R$ 480 a 660 |
| Envio de e-mail | SES Essentials, \~4 mil e-mails/mês | < US$ 1 (≈ R$ 5) | ≈ R$ 60 |
| Site, CDN e DNS | Cloudflare | R$ 0 | R$ 0 |
| Repositório e CI | GitHub, repositório público | R$ 0 | R$ 0 |
| Backups | restic (open source) para o Cloudflare R2, no plano gratuito (10 GB) | R$ 0 | R$ 0 |
| Domínio | leoreinaux.org | — | Renovação anual, já registrado |
| **Total** |  | **≈ R$ 45 a 60** | **≈ R$ 540 a 720** |

Com 10 mil inscritos e 4 posts por mês, o envio sobe para cerca de US$ 6 mensais; o resto não muda.

## Código aberto e reutilização

O repositório é público desde o primeiro commit, com o código em MIT e os textos em CC BY 4.0. Qualquer pessoa pode copiar a estrutura e publicar o próprio site trocando um arquivo de configuração e a pasta de posts.

- **Duas licenças, dois arquivos.** `LICENSE` (MIT) cobre código, componentes e scripts; `LICENSE-CONTENT` (CC BY 4.0) cobre `src/content/`. Cada post exibe a licença no rodapé.
- **Licenças das dependências.** Astro, Pagefind e Umami são MIT; Caddy é Apache-2.0; PostgreSQL tem licença própria permissiva. O Listmonk é AGPL-3.0: usá-lo sem modificar não gera obrigação; se o código dele for alterado, as alterações precisam ser publicadas.
- **Nenhum segredo no repositório.** Tokens da Cloudflare e do Listmonk ficam nos secrets do ambiente `producao` do GitHub, restrito à `main` e usado só pelo job de deploy; as credenciais do SES e os segredos da VPS ficam no `.env` da VPS; o repositório traz um `.env.example`.
- **README como guia de uso.** O que é o projeto, a stack, como rodar localmente, como subir a VPS com `docker compose up` e como fazer um fork em 5 passos.
- **`CLAUDE.md` para quem constrói com IA.** Convenções do projeto, comandos, metas de acessibilidade e performance e as regras do frontmatter, para que o Claude Code siga a arquitetura em cada sessão.
- **Espelho opcional no Codeberg.** O GitHub fica como principal pelo alcance e pelo Actions; um espelho em plataforma open source preserva o código se algo mudar.

## Roadmap

A v1 sai em quatro etapas, cada uma entregável e testável sozinha; a automação para redes sociais vem depois do lançamento, sobre a base já pronta.

**Etapa 1 — Fundação do site**

- [x] Repositório público com Astro 7, licenças, README e `CLAUDE.md`
- [x] Layout base, tipografia, temas claro e escuro
- [x] Coleção de posts com o schema do frontmatter
- [x] Deploy na Cloudflare pelo GitHub Actions e domínio apontado

**Etapa 2 — Descoberta**

- [x] Sitemap, RSS, `robots.txt`, `llms.txt` e versão Markdown dos posts
- [x] JSON-LD e Open Graph com imagens geradas no build
- [x] Busca com Pagefind
- [x] Lighthouse e axe-core no workflow de qualidade
- [x] Search Console, Bing Webmaster Tools e IndexNow

**Etapa 3 — Newsletter e analytics**

- [x] VPS com Docker Compose: Caddy, Listmonk, Umami, PostgreSQL e backup com restic
- [x] Conta SES com SPF, DKIM e DMARC; pedido de saída do sandbox
- [x] Formulário, lista double opt-in e template "novo post"
- [x] `scripts/newsletter.ts` ligado ao deploy
- [x] Política de privacidade

**Etapa 4 — Lançamento**

- [ ] Publicar o primeiro texto, "Por que estou voltando a produzir conteúdo"; o artigo sobre tecnologia brasileira, com vídeo e transcrição, vem depois
- [x] Páginas Sobre e Newsletter
- [x] Envio de teste para uma lista interna antes de abrir inscrições

**Depois do lançamento — redes sociais**

O campo `social` do frontmatter, o `summary`, as imagens de card e o RSS já servem de matéria-prima. A automação gera rascunhos por rede (LinkedIn, Instagram, X/Threads) a partir do texto principal; o agendamento pode usar uma ferramenta open source ou as APIs das próprias redes.

## Decisões em aberto

- [x] Newsletter: envio automático 2 horas após o deploy ou campanha em rascunho com envio manual? **Decidido:** envio automático às 7h (horário de Brasília) do dia seguinte à publicação, quando é mais provável ler com calma, em vez de 2 horas depois do deploy; o painel do Listmonk continua permitindo revisar ou cancelar até lá.
- [x] Fontes tipográficas: par serifada no texto + sem serifa nos títulos, ou uma família só? **Decidido:** Literata no corpo (desenhada para leitura longa em tela) e Source Sans 3 nos títulos e na interface, ambas OFL.
- [x] Crawlers de treinamento de IA (GPTBot, CCBot): liberar, coerente com CC BY e alcance máximo, ou bloquear? **Decidido:** liberar; o `robots.txt` libera pelo nome os crawlers de busca e de treinamento de IA.
- [x] Provedor e região da VPS. **Decidido:** Hetzner CX23 (2 vCPU, 4 GB) em Helsinque, na Finlândia, a única região com o CX23 disponível na contratação (a política de privacidade diz onde fica o servidor).
- [x] Domínio de envio: `leoreinaux.org` ou um subdomínio dedicado? **Decidido:** subdomínio dedicado, para separar a reputação de envio do domínio principal.
- [ ] Identidade visual: cores, logotipo e favicon

## Fontes

Consultadas em 26/10/2026; changelog do Astro consultado em 27/10/2026.

- [Changelog do Astro](https://github.com/withastro/astro/blob/main/packages/astro/CHANGELOG.md) — GitHub (versões 7.0.0 a 7.4.2)
- [Cloudflare Acquires Astro Technology Company](https://www.heise.de/en/news/Web-Development-Cloudflare-Acquires-Astro-Technology-Company-11145912.html?view=print) — heise
- [Cloudflare Pages vs Workers](https://flaviocopes.com/cloudflare-pages-vs-workers/) — flaviocopes.com
- [knadh/listmonk](https://github.com/knadh/listmonk) — GitHub
- [Amazon SES pricing plans in 2026](https://dev.to/mr_manushukla/amazon-ses-pricing-plans-in-2026-essentials-vs-pro-vs-enterprise-and-when-a-la-carte-still-wins-1ohg) — DEV Community
- [Limites do plano gratuito do Brevo](https://help.brevo.com/hc/en-us/articles/208580669) — Brevo
- [Hetzner June 2026 cloud price increase](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do) — PrivateDevOps
- [Umami v3](https://heise.de/-11069615) — heise
- [Pagefind](https://github.com/Pagefind/pagefind) — GitHub
- [llms.txt: status de adoção](https://seocom.agency/en/resources/seo-dictionary/llms-txt/) — SEOCOM
- [Stop subscription bombing on signup forms](https://www.ssdnodes.com/learn/stop-subscription-bombing-signups) — SSD Nodes
