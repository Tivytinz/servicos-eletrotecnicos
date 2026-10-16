-- Eletrotécnico GO — fundação de dados da gestão interna (PostgreSQL 15+).
-- Executar manualmente em banco privado de homologação; não rodar no build da landing.
-- Nunca conceder acesso direto às tabelas para visitantes anônimos.
BEGIN;
CREATE SCHEMA IF NOT EXISTS gestao;

CREATE TABLE gestao.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (length(trim(nome)) BETWEEN 2 AND 160),
  email text NOT NULL,
  senha_hash text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_email_normalizado CHECK (email = lower(trim(email))),
  CONSTRAINT usuarios_email_unico UNIQUE (email)
);

CREATE TABLE gestao.papeis (
  codigo text PRIMARY KEY CHECK (codigo IN ('admin', 'comercial', 'tecnico')),
  descricao text NOT NULL
);
INSERT INTO gestao.papeis (codigo, descricao) VALUES
  ('admin', 'Administração e conciliação financeira'),
  ('comercial', 'Captação e orçamentos'),
  ('tecnico', 'Execução e ordens de serviço')
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE gestao.usuarios_papeis (
  usuario_id uuid NOT NULL REFERENCES gestao.usuarios(id),
  papel_codigo text NOT NULL REFERENCES gestao.papeis(codigo),
  PRIMARY KEY (usuario_id, papel_codigo)
);

CREATE TABLE gestao.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (length(trim(nome)) BETWEEN 2 AND 200),
  telefone text,
  email text,
  cidade text,
  endereco_servico text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gestao.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES gestao.clientes(id),
  origem text NOT NULL DEFAULT 'nao_informada',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo','qualificado','orcamento_em_preparo','orcamento_enviado','aprovado','recusado','perdido')),
  responsavel_id uuid REFERENCES gestao.usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gestao.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES gestao.leads(id),
  versao_atual integer NOT NULL DEFAULT 1 CHECK (versao_atual >= 1),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviado','aprovado','recusado','expirado')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, lead_id)
);

CREATE TABLE gestao.orcamento_versoes (
  orcamento_id uuid NOT NULL REFERENCES gestao.orcamentos(id),
  versao integer NOT NULL CHECK (versao > 0),
  valor_centavos bigint NOT NULL CHECK (valor_centavos >= 0),
  descricao text NOT NULL,
  validade_em timestamptz,
  aprovado_em timestamptz,
  aprovado_por text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (orcamento_id, versao),
  CONSTRAINT aceite_coerente CHECK (
    (aprovado_em IS NULL AND aprovado_por IS NULL) OR
    (aprovado_em IS NOT NULL AND aprovado_por IS NOT NULL)
  )
);

CREATE TABLE gestao.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES gestao.orcamentos(id),
  versao_aprovada integer NOT NULL,
  responsavel_id uuid REFERENCES gestao.usuarios(id),
  status text NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta','agendada','em_execucao','pendente','concluida','cancelada')),
  agendada_para timestamptz,
  criada_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orcamento_id, versao_aprovada),
  FOREIGN KEY (orcamento_id, versao_aprovada)
    REFERENCES gestao.orcamento_versoes(orcamento_id, versao)
);

CREATE TABLE gestao.os_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES gestao.ordens_servico(id),
  ator_id uuid REFERENCES gestao.usuarios(id),
  status_anterior text,
  status_novo text NOT NULL,
  motivo text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gestao.recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES gestao.ordens_servico(id),
  referencia_externa text UNIQUE,
  valor_centavos bigint NOT NULL CHECK (valor_centavos > 0),
  recebido_em timestamptz NOT NULL,
  meio text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gestao.custos_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES gestao.ordens_servico(id),
  tipo text NOT NULL CHECK (tipo IN ('material','deslocamento','outro')),
  valor_centavos bigint NOT NULL CHECK (valor_centavos >= 0),
  km_milimetros bigint CHECK (km_milimetros >= 0),
  tarifa_centavos_km integer CHECK (tarifa_centavos_km >= 0),
  comprovante_referencia text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deslocamento_dados CHECK (
    (tipo = 'deslocamento' AND km_milimetros IS NOT NULL AND tarifa_centavos_km IS NOT NULL)
    OR (tipo <> 'deslocamento' AND km_milimetros IS NULL AND tarifa_centavos_km IS NULL)
  )
);

CREATE TABLE gestao.lancamentos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_idempotencia text NOT NULL UNIQUE,
  os_id uuid REFERENCES gestao.ordens_servico(id),
  recebimento_id uuid REFERENCES gestao.recebimentos(id),
  categoria text NOT NULL CHECK (categoria IN (
    'receita','material','deslocamento','provisao_anuncios',
    'empresa','victor','carlos','ajuste','estorno','aporte','reembolso'
  )),
  valor_centavos bigint NOT NULL CHECK (valor_centavos <> 0),
  referencia text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gestao.gastos_anuncios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo date NOT NULL,
  plataforma text NOT NULL,
  referencia_externa text,
  valor_centavos bigint NOT NULL CHECK (valor_centavos >= 0),
  UNIQUE (plataforma, referencia_externa)
);

CREATE TABLE gestao.fechamentos_mensais (
  competencia date PRIMARY KEY,
  provisao_centavos bigint NOT NULL,
  gasto_centavos bigint NOT NULL,
  saldo_centavos bigint NOT NULL,
  fechado_por uuid NOT NULL REFERENCES gestao.usuarios(id),
  fechado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competencia_primeiro_dia CHECK (extract(day from competencia) = 1)
);

CREATE TABLE gestao.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ator_id uuid REFERENCES gestao.usuarios(id),
  entidade text NOT NULL,
  entidade_id uuid,
  acao text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status_criado ON gestao.leads(status, criado_em DESC);
CREATE INDEX idx_os_status_criado ON gestao.ordens_servico(status, criada_em DESC);
CREATE INDEX idx_recebimentos_os ON gestao.recebimentos(os_id, recebido_em DESC);
CREATE INDEX idx_lancamentos_os ON gestao.lancamentos_financeiros(os_id, criado_em DESC);
CREATE INDEX idx_auditoria_entidade ON gestao.auditoria(entidade, entidade_id, criado_em DESC);

-- Falha fechada: revoga acesso genérico, mas grants/roles da aplicação
-- precisam ser configurados explicitamente antes de usar o banco.
REVOKE ALL ON SCHEMA gestao FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA gestao FROM PUBLIC;
COMMIT;
