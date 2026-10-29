# Servidor da newsletter e do analytics

Uma VPS pequena com Docker Compose roda o [Listmonk](https://listmonk.app) (newsletter), o [Umami](https://umami.is) (analytics sem cookies) e o PostgreSQL dos dois, atrás do [Caddy](https://caddyserver.com), que cuida do HTTPS. O site em si fica na Cloudflare e não depende deste servidor. Contexto em [`docs/arquitetura.md`](../docs/arquitetura.md).

| Arquivo | O que faz |
| --- | --- |
| `docker-compose.yml` | Os quatro serviços; só o Caddy fica exposto (portas 80 e 443) |
| `caddy/Caddyfile` | HTTPS automático, cabeçalhos de segurança e limite de 5 inscrições por IP a cada 10 minutos |
| `caddy/Dockerfile` | Caddy com o plugin de limite de requisições |
| `postgres/init-umami.sh` | Cria o banco e o usuário do Umami na primeira subida |
| `backup.sh` | Backup diário cifrado com restic, restauração e lista de backups |
| `.env.example` | Modelo das variáveis e segredos; a cópia preenchida (`.env`) nunca vai para o repositório |
| `listmonk/publico.css` | Visual do site nas páginas públicas do Listmonk |
| `listmonk/novo-post.html` | Modelo do e-mail de post novo, sincronizado com o Listmonk pelo deploy |
| `ses.md` | Roteiro do Amazon SES: domínio de envio, DKIM, SPF, DMARC, bounces e saída do sandbox |

## Subir a VPS

1. **Servidor.** Na Hetzner, crie um CX23 (2 vCPU, 4 GB) com Ubuntu LTS, na Alemanha ou na Finlândia, com a sua chave SSH. No firewall da Hetzner, libere só as portas 22, 80 e 443 (TCP) e 443 (UDP).
2. **DNS.** Na Cloudflare, crie registros `A` (e `AAAA`, se houver IPv6) para `newsletter` e `analytics` apontando para o IP da VPS, com o proxy **desligado** (nuvem cinza). Assim o Caddy emite os certificados e o limite de inscrições vê o IP real de quem se inscreve.
3. **Docker.** No servidor, instale o Docker Engine e o plugin Compose pelo [repositório oficial](https://docs.docker.com/engine/install/ubuntu/).
4. **Código e segredos.**

   ```bash
   git clone https://github.com/leoreinaux/leoreinaux.org.git /opt/leoreinaux.org
   cd /opt/leoreinaux.org/infra
   cp .env.example .env
   chmod 600 .env
   ```

   Preencha o `.env`. Para cada senha ou segredo, gere um valor com `openssl rand -base64 32 | tr -d '/+=' | cut -c1-32`.
5. **Subir.** `docker compose up -d --build`. Na primeira vez, o build do Caddy leva alguns minutos. Confira com `docker compose ps` e `docker compose logs -f`.
6. **Listmonk.** Entre em `https://newsletter.leoreinaux.org/admin` com o usuário e a senha do `.env` e, em *Settings*:
   - *General*: `Root URL` = `https://newsletter.leoreinaux.org`, nome do site e idioma português.
   - *SMTP*, bounces e remetente: siga o roteiro do Amazon SES em [`ses.md`](ses.md).
   - *Privacy*, como promete a política de privacidade do site (`/privacidade`):
     - *Individual subscriber tracking*: **desligado** (aberturas e cliques contados só no total);
     - *Record opt-in IP*: **ligado** (prova do consentimento);
     - *Allow unsubscribe*, *Allow exporting* e *Allow wiping*: **ligados** (a pessoa cancela, baixa e apaga os próprios dados pela página da inscrição).
   - *Appearance → Public*: cole o conteúdo de [`listmonk/publico.css`](listmonk/publico.css), para as páginas de inscrição, confirmação e descadastro terem o visual do site. Em *General*, use `Leandro Reinaux` como *Site name* e `https://leoreinaux.org/favicon.svg` como *Favicon URL*.
   - Crie a lista pública da newsletter, chamada **Novos textos** (é o nome que o leitor vê ao confirmar e ao cancelar), com *Opt-in* = **Double**, e copie o UUID dela para `newsletter.listUuid` no `site.config.ts`: só então o formulário de inscrição aparece no site.
   - **Usuário de API para o deploy.** Em *Users → User roles*, crie o papel `Campanhas automáticas` só com as permissões `lists:get_all`, `campaigns:get_all`, `campaigns:manage_all`, `campaigns:send`, `templates:get` e `templates:manage`. Em *Users*, crie o usuário `deploy` do tipo **API** com esse papel e copie o token. No GitHub, em *Settings → Environments → producao → Environment secrets*, crie os secrets `LISTMONK_API_USER` (`deploy`) e `LISTMONK_API_TOKEN` (o token). A partir daí, cada deploy com post novo com `newsletter: true` cria e agenda a campanha (`scripts/newsletter.ts`), e o modelo "Novo post" é mantido igual a [`listmonk/novo-post.html`](listmonk/novo-post.html).
   - Em *Settings → General*, escolha o idioma **Português (Brasil)**: é nele que aparecem a página de "confira o seu e-mail" e o e-mail de confirmação.
7. **Umami.** Entre em `https://analytics.leoreinaux.org` com `admin` / `umami`, **troque a senha na hora** e cadastre o site `leoreinaux.org`. Copie o *Website ID* dele para `analytics.websiteId` no `site.config.ts`: só então o script de estatísticas entra nas páginas.
8. **Backup.** Crie um bucket no Cloudflare R2 (10 GB grátis) e um token de API com permissão de leitura e escrita só nele. Preencha as variáveis `RESTIC_*` e `AWS_*` do `.env` e rode `./backup.sh` uma vez para criar o repositório e o primeiro backup. Depois agende com `crontab -e`:

   ```text
   30 3 * * * /opt/leoreinaux.org/infra/backup.sh >> /var/log/backup.log 2>&1
   ```

   Guarde a `RESTIC_PASSWORD` também fora da VPS (num gerenciador de senhas): sem ela, o backup não pode ser restaurado.

## Manutenção

- **Atualizar:** troque a versão da imagem em `docker-compose.yml` (sempre uma versão exata), faça o commit e, no servidor, rode `git pull && docker compose up -d --build`. O Listmonk aplica as migrações do banco sozinho ao subir. Antes, rode um `./backup.sh`.
- **Ver backups:** `./backup.sh snapshots`.
- **Restaurar:** `./backup.sh restaurar` grava o último dump em `infra/restauracao/postgres.sql`. Com o PostgreSQL de pé e o Listmonk e o Umami parados (`docker compose stop listmonk umami`), carregue com `docker compose exec -T postgres psql -U listmonk -d postgres < restauracao/postgres.sql` e suba tudo de novo. Dois erros são esperados e inofensivos: `role "listmonk" already exists` e `current user cannot be dropped`. Teste a restauração de vez em quando, numa VPS temporária.
- **Licenças:** Caddy (Apache-2.0), PostgreSQL (licença PostgreSQL), Umami (MIT), restic (BSD-2-Clause) e Listmonk (AGPL-3.0, usado sem modificações).
