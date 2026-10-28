#!/bin/sh
# Roda só na criação do banco (volume vazio): cria o usuário e o banco do Umami,
# separados do Listmonk, que usa o usuário principal e o banco "listmonk".
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set=senha="$UMAMI_DB_PASSWORD" <<'SQL'
CREATE ROLE umami LOGIN PASSWORD :'senha';
CREATE DATABASE umami OWNER umami;
SQL
