-- Sessões persistentes, somente hashes de tokens aleatórios.
BEGIN;
CREATE TABLE gestao.sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES gestao.usuarios(id),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  criada_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  revogada_em timestamptz,
  ultimo_uso_em timestamptz,
  CONSTRAINT sessao_expiracao CHECK (expira_em > criada_em)
);
CREATE INDEX idx_sessoes_usuario ON gestao.sessoes(usuario_id, expira_em DESC);
CREATE INDEX idx_sessoes_validade ON gestao.sessoes(expira_em) WHERE revogada_em IS NULL;
REVOKE ALL ON ALL TABLES IN SCHEMA gestao FROM PUBLIC;
COMMIT;
