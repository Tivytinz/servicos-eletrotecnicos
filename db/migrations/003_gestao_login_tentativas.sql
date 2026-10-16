-- Aplicada transacionalmente por scripts/gestao-migrate.mjs.
-- Controle distribuído de tentativas por identificador de conta (SHA-256).
CREATE TABLE gestao.tentativas_login (
  chave_hash text PRIMARY KEY CHECK (length(chave_hash) = 64),
  inicio_janela timestamptz NOT NULL DEFAULT now(),
  tentativas integer NOT NULL DEFAULT 1 CHECK (tentativas >= 1)
);
CREATE INDEX idx_tentativas_login_inicio ON gestao.tentativas_login(inicio_janela);
REVOKE ALL ON ALL TABLES IN SCHEMA gestao FROM PUBLIC;
