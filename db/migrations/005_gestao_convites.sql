-- Convites individuais com prazo, revogação, consumo único e trilha de responsável.
-- Esta migration não habilita o painel e não amplia os privilégios de gestao_app.
CREATE TABLE gestao.convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  usuario text NOT NULL CHECK (usuario ~ '^[a-z][a-z0-9_.-]{2,31}$'),
  papel_codigo text NOT NULL REFERENCES gestao.papeis(codigo),
  criado_por uuid NOT NULL REFERENCES gestao.usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  usado_em timestamptz,
  revogado_em timestamptz,
  usuario_criado_id uuid REFERENCES gestao.usuarios(id),
  CONSTRAINT convite_expiracao CHECK (expira_em > criado_em),
  CONSTRAINT convite_consumo_consistente CHECK (
    (usado_em IS NULL AND usuario_criado_id IS NULL)
    OR (usado_em IS NOT NULL AND usuario_criado_id IS NOT NULL)
  ),
  CONSTRAINT convite_sem_consumo_revogado CHECK (
    NOT (usado_em IS NOT NULL AND revogado_em IS NOT NULL)
  )
);
CREATE INDEX convites_usuario_pendente_idx ON gestao.convites(usuario)
  WHERE usado_em IS NULL AND revogado_em IS NULL;
CREATE INDEX convites_expiracao_idx ON gestao.convites(expira_em)
  WHERE usado_em IS NULL AND revogado_em IS NULL;
REVOKE ALL ON gestao.convites FROM PUBLIC;
-- Sem GRANT ao usuário web por enquanto: fluxos de emissão/aceite exigem
-- autorização server-side e operação atômica antes de serem ativados.
