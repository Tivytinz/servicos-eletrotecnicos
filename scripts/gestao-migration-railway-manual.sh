#!/usr/bin/env bash
# Executa APENAS preflight ou UM pacote autorizado 012/013/014 via Railway SSH.
# Somente workflow manual/comando de titular na main, com segredos de ambiente protegidos.
set -Eeuo pipefail
set +x

if [[ "$#" -ne 3 ]]; then
  echo "BLOQUEIO: modo, release e confirmação são obrigatórios." >&2
  exit 2
fi
MODE="$1"
RELEASE="$2"
CONFIRMACAO="$3"

if [[ "$GITHUB_REF" != "refs/heads/main" ]]; then
  echo "BLOQUEIO: operação permitida somente na main." >&2
  exit 2
fi
case "$MODE" in
  verificar|aplicar) ;;
  *) echo "BLOQUEIO: modo desconhecido." >&2; exit 2 ;;
esac
case "$RELEASE" in
  012)
    ANTERIOR=11
    POSTERIOR=12
    CONFIRMACAO_ESPERADA="APLICAR_012_PRODUCAO_SEM_BACKUP"
    PACOTE="db/operacoes/gestao-orcamentos-012-atomico.sql"
    ;;
  013)
    ANTERIOR=12
    POSTERIOR=13
    CONFIRMACAO_ESPERADA="APLICAR_013_PRODUCAO_SEM_BACKUP"
    PACOTE="db/operacoes/gestao-orcamentos-013-atomico.sql"
    ;;
  014)
    ANTERIOR=13
    POSTERIOR=14
    CONFIRMACAO_ESPERADA="APLICAR_014_PRODUCAO_SEM_BACKUP"
    PACOTE="db/operacoes/gestao-os-014-atomico.sql"
    ;;
  *) echo "BLOQUEIO: somente releases 012, 013 ou 014." >&2; exit 2 ;;
esac
if [[ "$MODE" == "aplicar" && "$CONFIRMACAO" != "$CONFIRMACAO_ESPERADA" ]]; then
  echo "BLOQUEIO: confirmação de produção inválida." >&2
  exit 2
fi
if [[ "$MODE" == "verificar" && -n "$CONFIRMACAO" ]]; then
  echo "BLOQUEIO: o modo verificar não aceita confirmação de escrita." >&2
  exit 2
fi
if [[ -z "$RAILWAY_API_TOKEN" || ! -f "$RAILWAY_GESTAO_IDENTITY_FILE" ]]; then
  echo "BLOQUEIO: credencial do Railway ou chave SSH da automação indisponível." >&2
  exit 2
fi
PREFLIGHT="db/operacoes/gestao-preflight-012-013-somente-leitura.sql"
if [[ "$RELEASE" == "014" ]]; then
  PREFLIGHT="db/operacoes/gestao-preflight-014-somente-leitura.sql"
fi
if [[ ! -f "$PREFLIGHT" || ! -f "$PACOTE" ]]; then
  echo "BLOQUEIO: catálogo SQL incompleto no checkout." >&2
  exit 2
fi

# Sem TCP Proxy público, sem senha/URL SQL na aplicação e sem NODE_ENV de produção.
remote_psql() {
  timeout -k 5s 70s railway ssh \
    --project 1f92833f-04f8-44d4-931d-3d688d674c7e \
    --service Postgres --environment production \
    -i "$RAILWAY_GESTAO_IDENTITY_FILE" -- \
    psql -X -v ON_ERROR_STOP=1 -U postgres -d railway "$@"
}

verificar_catalogo() {
  local historico nome checksum arquivo esperado total
  historico="$(remote_psql -A -t -F '|' -c 'SELECT versao,checksum FROM gestao.schema_migrations ORDER BY versao')"
  total=0
  [[ -n "$historico" ]] || { echo "BLOQUEIO: histórico de migrations vazio."; return 1; }
  while IFS='|' read -r nome checksum; do
    [[ "$nome" =~ ^[0-9]{3}_[a-z0-9_]+\.sql$ ]] || { echo "BLOQUEIO: nome de migration inesperado."; return 1; }
    [[ "$checksum" =~ ^[a-f0-9]{64}$ ]] || { echo "BLOQUEIO: checksum inválido no banco."; return 1; }
    arquivo="db/migrations/$nome"
    [[ -f "$arquivo" ]] || { echo "BLOQUEIO: migration do banco ausente no repositório."; return 1; }
    esperado="$(sha256sum "$arquivo" | cut -d ' ' -f 1)"
    [[ "$esperado" == "$checksum" ]] || {
      echo "BLOQUEIO: divergência de checksum na migration $nome." >&2
      return 1
    }
    total=$((total + 1))
  done <<< "$historico"
  [[ "$total" -ge 11 && "$total" -le 14 ]] || {
    echo "BLOQUEIO: contagem de migrations fora da faixa esperada: $total." >&2
    return 1
  }
  TOTAL_VERIFICADO="$total"
  echo "CATÁLOGO: $total migrations aplicadas, todas com SHA-256 válido."
}

echo "ETAPA: preflight remoto somente leitura."
cat "$PREFLIGHT" | remote_psql -f -
verificar_catalogo

if [[ "$MODE" == "verificar" ]]; then
  echo "CONCLUÍDO: diagnóstico somente leitura; nenhuma migration executada."
  exit 0
fi

if [[ "$TOTAL_VERIFICADO" != "$ANTERIOR" ]]; then
  echo "BLOQUEIO: release $RELEASE exige exatamente $ANTERIOR migrations; encontradas $TOTAL_VERIFICADO." >&2
  exit 1
fi
echo "ETAPA: aplicar pacote transacional $RELEASE (autorização manual específica)."
cat "$PACOTE" | remote_psql -f -

echo "ETAPA: verificar após a transação."
cat "$PREFLIGHT" | remote_psql -f -
verificar_catalogo
if [[ "$TOTAL_VERIFICADO" != "$POSTERIOR" ]]; then
  echo "ALERTA: estado pós-operação não corresponde à release $RELEASE. Verificação humana necessária." >&2
  exit 1
fi
echo "CONCLUÍDO: release $RELEASE aplicada; histórico confirmado $POSTERIOR/14. Nenhuma flag foi habilitada."
