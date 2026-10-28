# leoreinaux.org

Site pessoal de textos longos e aprofundados, em português, publicado em [leoreinaux.org](https://leoreinaux.org).

O código é aberto para que qualquer pessoa possa reutilizar a mesma base: troque um arquivo de configuração e a pasta de posts, e o resto funciona. A arquitetura completa, com as decisões e o roadmap, está em [`docs/arquitetura.md`](docs/arquitetura.md).

## Stack

| Camada | Escolha | Licença |
| --- | --- | --- |
| Gerador do site | [Astro 7](https://astro.build), saída 100% estática | MIT |
| Linguagem | TypeScript (modo estrito) | Apache-2.0 |
| Hospedagem | Cloudflare Workers com static assets, publicado pelo [wrangler](https://github.com/cloudflare/workers-sdk) | MIT ou Apache-2.0 |
| CI/CD | GitHub Actions | — |
| Fontes | Famílias com licença SIL OFL, servidas pelo próprio site | OFL-1.1 |

Newsletter (Listmonk), analytics (Umami), busca (Pagefind) e SEO avançado entram nas próximas etapas do roadmap.

## Como rodar localmente

Requisitos: Node.js 22.23.4 ou mais novo (o projeto usa o Node 24 LTS, indicado em `.nvmrc`) e npm.

```bash
npm install
```

```bash
npm run dev
```

O site abre em http://localhost:4321. No modo de desenvolvimento, os rascunhos (`draft: true`) aparecem na lista.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run check` | Verifica tipos e o frontmatter dos posts |
| `npm run build` | Verifica e gera o site estático em `dist/`, sem os rascunhos |
| `npm run preview` | Serve o conteúdo de `dist/` localmente |
| `npm run deploy` | Publica `dist/` na Cloudflare (requer credenciais) |

## Como escrever um post

Cada post é uma pasta em `src/content/posts/`. O nome da pasta vira a URL: `src/content/posts/meu-texto/` é publicado em `/posts/meu-texto`.

```text
src/content/posts/meu-texto/
├── index.md          # texto + frontmatter
├── capa.jpg          # imagem de capa
└── transcricao.md    # opcional, para posts com vídeo
```

O post de exemplo em [`src/content/posts/exemplo/`](src/content/posts/exemplo/index.md) usa todos os campos. Campos obrigatórios: `title`, `description` (até 160 caracteres), `summary`, `pubDate`, `cover.src`, `cover.alt` e `newsletter`. Se algum faltar, o build falha.

## Como fazer um fork

1. Faça o fork do repositório e clone o seu.
2. Edite [`site.config.ts`](site.config.ts) com o seu nome, URL, bio, redes sociais e URL da newsletter.
3. Apague os posts de `src/content/posts/` e crie os seus, seguindo o post de exemplo.
4. Troque `name` e o domínio em `routes` no [`wrangler.jsonc`](wrangler.jsonc).
5. Crie os secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no seu repositório (Settings › Secrets and variables › Actions). O próximo push na `main` publica o site.

Se os seus textos não forem seus para licenciar em CC BY 4.0, ajuste também o `LICENSE-CONTENT` e o campo `contentLicense` do `site.config.ts`.

## Licenças

- Código: [MIT](LICENSE).
- Textos e imagens em `src/content/`: [CC BY 4.0](LICENSE-CONTENT).
- Fontes: SIL Open Font License 1.1, com o texto da licença ao lado dos arquivos em `src/assets/fonts/`.
