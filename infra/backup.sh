#!/usr/bin/env bash
# Backup diário da VPS com restic, cifrado, num bucket S3 compatível (ver .env.example).
# Guarda um dump de todos os bancos (Listmonk e Umami) e os uploads do Listmonk.
# O restic roda na imagem oficial, sem instalar nada no servidor.
#
# Uso: infra/backup.sh             faz o backup e apaga os antigos
#      infra/backup.sh snapshots   lista os backups
#      infra/backup.sh restaurar   restaura o último dump para infra/restauracao/postgres.sql
# Agendamento sugerido (crontab -e do root): 30 3 * * * /opt/leoreinaux.org/infra/backup.sh >> /var/log/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")"
set -a
# shellcheck disable=SC1091
source .env
set +a

RESTIC_IMAGEM=restic/restic:0.19.1
PROJETO=$(basename "$PWD")

restic() {
  docker run --rm -i \
    -e RESTIC_REPOSITORY -e RESTIC_PASSWORD -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
    --hostname leoreinaux-vps \
    "$@"
}

case "${1:-backup}" in
  snapshots)
    restic "$RESTIC_IMAGEM" snapshots
    ;;
  restaurar)
    mkdir -p restauracao
    restic "$RESTIC_IMAGEM" dump --tag postgres latest /postgres.sql > restauracao/postgres.sql
    echo "Dump restaurado em infra/restauracao/postgres.sql. Para carregar num banco vazio:"
    echo "  docker compose exec -T postgres psql -U \$POSTGRES_USER -d postgres < restauracao/postgres.sql"
    ;;
  backup)
    # Cria o repositório na primeira execução.
    restic "$RESTIC_IMAGEM" cat config > /dev/null 2>&1 || restic "$RESTIC_IMAGEM" init

    echo "$(date -Is) dump do PostgreSQL"
    docker compose exec -T postgres pg_dumpall --clean --if-exists -U "$POSTGRES_USER" |
      restic "$RESTIC_IMAGEM" backup --stdin --stdin-filename postgres.sql --tag postgres

    echo "$(date -Is) uploads do Listmonk"
    restic -v "${PROJETO}_listmonk-uploads:/uploads:ro" "$RESTIC_IMAGEM" backup /uploads --tag uploads

    echo "$(date -Is) limpeza: 7 diários, 4 semanais e 12 mensais"
    restic "$RESTIC_IMAGEM" forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
    echo "$(date -Is) backup concluído"
    ;;
  *)
    echo "Uso: $0 [backup|snapshots|restaurar]" >&2
    exit 1
    ;;
esac
