# Caddy com o plugin de limite de requisições, que não vem na imagem padrão.
# Ele segura inscrições em massa no formulário da newsletter (ver Caddyfile).
FROM caddy:2.11.7-builder AS builder
RUN xcaddy build --with github.com/mholt/caddy-ratelimit@v0.1.1-0.20260612195517-5625512f24f6

FROM caddy:2.11.7
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
