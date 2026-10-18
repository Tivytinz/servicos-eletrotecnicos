#!/usr/bin/env bash
# Testa pg_dump + pg_restore EXCLUSIVAMENTE contra o serviço PostgreSQL descartável do CI.
# Nunca apontar para Railway/produção. Arquivo nunca é publicado como artefato.
set -euo pipefail
umask 077

if [[ "${GESTAO_BACKUP_QA:-}" != "BANCO_DESCARTAVEL"
   || "${PGHOST:-}" != "127.0.0.1"
   || "${PGPORT:-}" != "5432"
   || "${PGUSER:-}" != "postgres"
   || "${PGDATABASE:-}" != "gestao_test"
   || "${PGPASSWORD:-}" != "postgres"
   || -z "${CI:-}" ]]; then
  echo "BLOQUEIO: este roteiro aceita apenas o PostgreSQL descartável do CI." >&2
  exit 2
fi

source_db="gestao_test"
restore_db="gestao_restore_qa"
archive_dir="$(mktemp -d)"
archive="${archive_dir}/gestao-qa.dump"
restore_created=0
run_pg() {
  docker run --rm --network host \
    -e PGHOST=127.0.0.1 -e PGPORT=5432 -e PGUSER=postgres \
    -e PGPASSWORD=postgres postgres:16 "$@"
}
cleanup() {
  if [[ "$restore_created" == 1 ]]; then
    run_pg dropdb --if-exists "$restore_db" >/dev/null 2>&1 || true
  fi
  rm -rf "$archive_dir"
}
trap cleanup EXIT

# O teste nunca deve apagar banco pré-existente: falha se o alvo já existir.
if [[ "$(run_pg psql -Atq -d postgres -c "SELECT count(*) FROM pg_database WHERE datname = '$restore_db'")" != 0 ]]; then
  echo "BLOQUEIO: banco de QA de destino já existe." >&2
  exit 1
fi

echo "QA: exportando banco sintético para arquivo temporário privado."
run_pg pg_dump -d "$source_db" --format=custom --no-owner --no-acl > "$archive"
if [[ ! -s "$archive" ]]; then
  echo "FALHA: pg_dump não produziu arquivo." >&2
  exit 1
fi
sha256sum "$archive" >/dev/null
run_pg pg_restore --list < "$archive" >/dev/null

echo "QA: criando banco isolado para restaurar."
run_pg createdb "$restore_db"
restore_created=1
run_pg pg_restore --exit-on-error --no-owner --no-acl -d "$restore_db" < "$archive"

# Verifica dados e metadados reais. Nenhuma linha com cliente/senha é impressa.
verify_query="SELECT (SELECT count(*) FROM gestao.schema_migrations)::text || '|' || (SELECT string_agg(versao || ':' || checksum, ',' ORDER BY versao) FROM gestao.schema_migrations) || '|' || (SELECT string_agg(codigo, ',' ORDER BY codigo) FROM gestao.papeis) || '|' || (SELECT count(*) FROM gestao.usuarios)::text || '|' || (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='gestao')::text"
original="$(run_pg psql -Atq -d "$source_db" -c "$verify_query")"
restored="$(run_pg psql -Atq -d "$restore_db" -c "$verify_query")"
if [[ -z "$original" || "$original" != "$restored" ]]; then
  echo "FALHA: estrutura, migrations, papéis ou contagens divergentes na restauração." >&2
  exit 1
fi
# Exige dados sintéticos não vazios presentes em ambos os bancos.
if [[ "$(run_pg psql -Atq -d "$restore_db" -c "SELECT count(*) FROM gestao.papeis")" -lt 3 ]]; then
  echo "FALHA: dados-base não restaurados." >&2
  exit 1
fi

echo "APROVADO: pg_dump íntegro e pg_restore validado em banco descartável."
echo "AVISO: este teste NÃO é backup de produção nem comprova restauração de dados reais."
