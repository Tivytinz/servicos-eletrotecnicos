-- ELETROTÉCNICO GO — APLICAÇÃO ATÔMICA DE GESTÃO 005–009
-- 05/11/2026 · Fonte: commit main 33aa44b0a2de2937b5e38a108a54e912799ca3bf
-- Procedimento manual de alto risco: SEM BACKUP por decisão do responsável.
-- NÃO roda no build/deploy. NÃO conectar com gestao_app.
-- Execute o ARQUIVO INTEIRO com psql -X -v ON_ERROR_STOP=1 -f, em terminal administrativo privado.
-- O editor Query do Railway NÃO foi validado para scripts SQL multi-statement.
-- NÃO separar em partes, NÃO executar se só um trecho foi selecionado.
-- Todas as cinco migrations e os GRANTs abaixo usam UMA transação: falha -> ROLLBACK.
-- A restauração de estado anterior em caso de falha depois de COMMIT não existe sem backup.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $preflight$
DECLARE
  v_count integer;
BEGIN
  IF NOT pg_try_advisory_xact_lock(20261016,1) THEN
    RAISE EXCEPTION 'BLOQUEIO: outra migration está em execução';
  END IF;
  IF current_database() <> 'railway' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'BLOQUEIO: banco ou papel SQL incorreto';
  END IF;
  IF (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='gestao') <> current_user THEN
    RAISE EXCEPTION 'BLOQUEIO: conta SQL não é dona do schema gestao';
  END IF;
  IF NOT has_schema_privilege(current_user,'gestao','CREATE') THEN
    RAISE EXCEPTION 'BLOQUEIO: sem privilégio CREATE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='gestao_app') THEN
    RAISE EXCEPTION 'BLOQUEIO: role gestao_app inexistente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='pgcrypto') THEN
    RAISE EXCEPTION 'BLOQUEIO: extensão pgcrypto indisponível';
  END IF;
  SELECT COUNT(*) INTO v_count FROM gestao.schema_migrations;
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'BLOQUEIO: histórico inesperado: % migrations existentes',v_count;
  END IF;
  IF EXISTS (
    SELECT 1 FROM gestao.schema_migrations m
    FULL JOIN (VALUES
      ('001_gestao_base.sql','b0885a290d563dc3b9a44c4c91dd5980d2bcf92938234e003ef7c039885157b7'),
      ('002_gestao_sessoes.sql','eb4b135b80cfed61ee828334378db6f0fe19521a2a956f739e5e06ae6011bf88'),
      ('003_gestao_login_tentativas.sql','0422cbd4bc760f0038292c4d004fc517f4c7da0452ccc08a01943895c4616a9f'),
      ('004_gestao_usuario_login.sql','fbf851c1265f500bf38ff3a04ce296563c089c24beadae30320d3d5a3bcc5799')
    ) AS e(versao,checksum) USING (versao)
    WHERE m.versao IS NULL OR e.versao IS NULL OR m.checksum IS DISTINCT FROM e.checksum
  ) THEN
    RAISE EXCEPTION 'BLOQUEIO: migration 001-004 divergente/ausente/desconhecida';
  END IF;
  IF to_regclass('gestao.convites') IS NOT NULL OR
     to_regclass('gestao.verificadores_senha') IS NOT NULL THEN
    RAISE EXCEPTION 'BLOQUEIO: objetos de migrations novas já estão presentes';
  END IF;
END;
$preflight$;

-- ===== INÍCIO 005_gestao_convites.sql — conteúdo integral do commit de referência =====
-- Convites individuais com prazo, revogação, consumo único e trilha de responsável.
-- Esta migration não habilita o painel e não amplia os privilégios de gestao_app.
CREATE TABLE gestao.convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  usuario text NOT NULL CHECK (usuario ~ '^[a-z][a-z0-9_.-]{2,31}$'),
  papel_codigo text NOT NULL REFERENCES gestao.papeis(codigo),
  -- Convite inicial gerado somente por operação DBA: sem administrador logado.
  -- Convites normais sempre registram criado_por e não apontam conta existente.
  criado_por uuid REFERENCES gestao.usuarios(id),
  usuario_existente_id uuid REFERENCES gestao.usuarios(id),
  CONSTRAINT convite_origem_coerente CHECK (
    (criado_por IS NOT NULL AND usuario_existente_id IS NULL)
    OR (criado_por IS NULL AND usuario_existente_id IS NOT NULL AND papel_codigo = 'admin')
  ),
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
-- Apenas um convite pendente por usuário; convites expirados são revogados
-- na função de emissão antes de permitir nova tentativa.
CREATE UNIQUE INDEX convites_um_pendente_por_usuario_idx ON gestao.convites(usuario)
  WHERE usado_em IS NULL AND revogado_em IS NULL;
CREATE INDEX convites_expiracao_idx ON gestao.convites(expira_em)
  WHERE usado_em IS NULL AND revogado_em IS NULL;
REVOKE ALL ON gestao.convites FROM PUBLIC;
-- Sem GRANT ao usuário web por enquanto: fluxos de emissão/aceite exigem
-- autorização server-side e operação atômica antes de serem ativados.
-- ===== FIM 005_gestao_convites.sql =====
INSERT INTO gestao.schema_migrations(versao,checksum)
VALUES ('005_gestao_convites.sql','ef3fe466b216414e1003f15942dbb29192371d14c7c6d0acfb3a4a9e74643596');

-- ===== INÍCIO 006_gestao_convites_funcoes.sql — conteúdo integral do commit de referência =====
-- Entrada controlada para convites: gestao_app recebe EXECUTE, nunca INSERT em usuários/papéis.
-- Funções SECURITY DEFINER com search_path seguro e SQL estático/parametrizado.
-- O proprietário da migration deve ser confiável e a role gestao_app não pode criá-las.
CREATE FUNCTION gestao.emitir_convite(
  p_sessao_hash text, p_token_hash text, p_usuario text, p_papel text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ator uuid;
  v_convite uuid;
BEGIN
  IF p_sessao_hash !~ '^[a-f0-9]{64}$'
    OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR p_usuario !~ '^[a-z][a-z0-9_.-]{2,31}$'
    OR p_papel NOT IN ('admin','comercial','tecnico') THEN
    RETURN NULL;
  END IF;
  SELECT u.id INTO v_ator
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id = s.usuario_id
  JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
  WHERE s.token_hash = p_sessao_hash AND s.revogada_em IS NULL
    AND s.expira_em > clock_timestamp() AND u.ativo = true
    AND up.papel_codigo = 'admin'
  LIMIT 1;
  IF v_ator IS NULL OR EXISTS (
    SELECT 1 FROM gestao.usuarios u WHERE u.usuario = p_usuario
  ) THEN
    RETURN NULL;
  END IF;
  -- Revoga links expirados do mesmo usuário antes de reemitir. O índice único
  -- impede que dois administradores emitam simultaneamente links ativos iguais.
  UPDATE gestao.convites c SET revogado_em = clock_timestamp()
  WHERE c.usuario = p_usuario AND c.usado_em IS NULL
    AND c.revogado_em IS NULL AND c.expira_em <= clock_timestamp();
  -- Mesmo que uma action receba um usuário arbitrário, a sessão e o papel são
  -- verificados pelo banco. A integridade do token é garantida por UNIQUE.
  INSERT INTO gestao.convites (token_hash, usuario, papel_codigo, criado_por, expira_em)
  VALUES (p_token_hash, p_usuario, p_papel, v_ator, clock_timestamp() + interval '24 hours')
  RETURNING id INTO v_convite;
  INSERT INTO gestao.auditoria (ator_id, entidade, entidade_id, acao, detalhes)
  VALUES (v_ator, 'convite', v_convite, 'emitir', jsonb_build_object('usuario', p_usuario, 'papel', p_papel));
  RETURN v_convite;
EXCEPTION WHEN unique_violation THEN
  RETURN NULL;
END;
$$;

CREATE FUNCTION gestao.aceitar_convite(
  p_token_hash text, p_nome text, p_senha_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_convite gestao.convites%ROWTYPE;
  v_novo_usuario uuid;
BEGIN
  IF p_token_hash !~ '^[a-f0-9]{64}$'
    OR char_length(trim(p_nome)) NOT BETWEEN 2 AND 160
    OR p_senha_hash !~ '^scrypt[$]16384[$]8[$]1[$][a-f0-9]{32}[$][a-f0-9]{128}$'
  THEN
    RETURN NULL;
  END IF;

  -- A trava é mantida até o final da instrução, incluindo usuário, papel e auditoria.
  SELECT c.* INTO v_convite FROM gestao.convites c
  WHERE c.token_hash = p_token_hash
  FOR UPDATE;
  IF NOT FOUND OR v_convite.usado_em IS NOT NULL
    OR v_convite.revogado_em IS NOT NULL
    OR v_convite.expira_em <= clock_timestamp() THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM gestao.usuarios u WHERE u.usuario = v_convite.usuario) THEN
    RETURN NULL;
  END IF;

  INSERT INTO gestao.usuarios (nome, usuario, senha_hash)
  VALUES (trim(p_nome), v_convite.usuario, p_senha_hash)
  RETURNING id INTO v_novo_usuario;
  INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo)
  VALUES (v_novo_usuario, v_convite.papel_codigo);
  UPDATE gestao.convites c SET usado_em = clock_timestamp(), usuario_criado_id = v_novo_usuario
  WHERE c.id = v_convite.id;
  INSERT INTO gestao.auditoria (ator_id, entidade, entidade_id, acao, detalhes)
  VALUES (v_novo_usuario, 'convite', v_convite.id, 'aceitar',
    jsonb_build_object('usuario', v_convite.usuario, 'papel', v_convite.papel_codigo));
  RETURN v_novo_usuario;
EXCEPTION WHEN unique_violation THEN
  RETURN NULL;
END;
$$;

CREATE FUNCTION gestao.revogar_convite(p_sessao_hash text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ator uuid;
  v_alvo uuid;
BEGIN
  IF p_sessao_hash !~ '^[a-f0-9]{64}$' OR p_id IS NULL THEN RETURN false; END IF;
  SELECT u.id INTO v_ator
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id = s.usuario_id
  JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
  WHERE s.token_hash = p_sessao_hash AND s.revogada_em IS NULL
    AND s.expira_em > clock_timestamp() AND u.ativo = true
    AND up.papel_codigo = 'admin'
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN false; END IF;

  SELECT c.id INTO v_alvo FROM gestao.convites c
  WHERE c.id = p_id AND c.usado_em IS NULL AND c.revogado_em IS NULL
  FOR UPDATE;
  IF v_alvo IS NULL THEN RETURN false; END IF;

  UPDATE gestao.convites c SET revogado_em = clock_timestamp() WHERE c.id = v_alvo;
  INSERT INTO gestao.auditoria (ator_id, entidade, entidade_id, acao)
  VALUES (v_ator, 'convite', v_alvo, 'revogar');
  RETURN true;
END;
$$;

-- Funções são EXECUTE PUBLIC por padrão no PostgreSQL: revogação explícita.
REVOKE ALL ON FUNCTION gestao.emitir_convite(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION gestao.aceitar_convite(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION gestao.revogar_convite(text,uuid) FROM PUBLIC;
-- ===== FIM 006_gestao_convites_funcoes.sql =====
INSERT INTO gestao.schema_migrations(versao,checksum)
VALUES ('006_gestao_convites_funcoes.sql','afdcf315ea3cd4189f97891c3cc4be0cc4ca562bbf5575fa3b0bd25fcb691361');

-- ===== INÍCIO 007_gestao_listar_convites.sql — conteúdo integral do commit de referência =====
-- Visibilidade administrativa restrita; nenhum hash de token é retornado.
-- A role da aplicação recebe apenas EXECUTE nesta função.
CREATE FUNCTION gestao.listar_convites(p_sessao_hash text)
RETURNS TABLE (
  id uuid,
  usuario text,
  papel_codigo text,
  criado_em timestamptz,
  expira_em timestamptz,
  status text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_sessao_hash IS NULL OR p_sessao_hash !~ '^[a-f0-9]{64}$'
    OR NOT EXISTS (
      SELECT 1 FROM gestao.sessoes s
      JOIN gestao.usuarios u ON u.id = s.usuario_id
      JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
      WHERE s.token_hash = p_sessao_hash
        AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
        AND u.ativo = true AND up.papel_codigo = 'admin'
    )
  THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT c.id, c.usuario, c.papel_codigo, c.criado_em, c.expira_em,
      (CASE
        WHEN c.usado_em IS NOT NULL THEN 'utilizado'
        WHEN c.revogado_em IS NOT NULL THEN 'revogado'
        WHEN c.expira_em <= clock_timestamp() THEN 'expirado'
        ELSE 'pendente'
      END)::text AS status
    FROM gestao.convites c
    ORDER BY c.criado_em DESC, c.id DESC
    LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION gestao.listar_convites(text) FROM PUBLIC;
-- ===== FIM 007_gestao_listar_convites.sql =====
INSERT INTO gestao.schema_migrations(versao,checksum)
VALUES ('007_gestao_listar_convites.sql','b0a4d61ca142c7b99a3507348e3e89cddef0a6069271a11c11b3f53fe37caa97');

-- ===== INÍCIO 008_gestao_sessoes_protegidas.sql — conteúdo integral do commit de referência =====
-- Sessões emitidas apenas mediante verificação de senha dentro do PostgreSQL.
-- Evita que credenciais SQL da aplicação construam sessões administrativas.
-- O registro de verificadores legados exige processo administrativo separado.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE gestao.verificadores_senha (
  usuario_id uuid PRIMARY KEY REFERENCES gestao.usuarios(id) ON DELETE CASCADE,
  bcrypt_hash text NOT NULL CHECK (bcrypt_hash ~ '^[$]2[aby][$]12[$].{53}$'),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gestao.limites_sessoes (
  chave text PRIMARY KEY,
  inicio_janela timestamptz NOT NULL DEFAULT now(),
  tentativas integer NOT NULL DEFAULT 1 CHECK (tentativas >= 1)
);
REVOKE ALL ON gestao.verificadores_senha, gestao.limites_sessoes FROM PUBLIC;

-- Sessões emitidas antes do novo controle de integridade não são confiáveis.
-- Invalidação é planejada para o rollout coordenado; requer aprovação operacional.
UPDATE gestao.sessoes SET revogada_em = clock_timestamp()
WHERE revogada_em IS NULL;

CREATE FUNCTION gestao.emitir_sessao_segura(
  p_identificador text, p_senha text, p_token_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_verificador text;
  v_tentativas integer;
  v_sessao_id uuid;
BEGIN
  IF p_identificador IS NULL OR char_length(p_identificador) NOT BETWEEN 3 AND 254
    OR p_identificador <> lower(trim(p_identificador))
    OR p_senha IS NULL OR char_length(p_senha) NOT BETWEEN 12 AND 1024
    OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN NULL;
  END IF;

  -- Contadores são internos à função; nenhuma role de aplicação altera esta tabela.
  -- Limite global para chamadas SQL diretas que burlariam o rate limit HTTP.
  INSERT INTO gestao.limites_sessoes AS t (chave, inicio_janela, tentativas)
  VALUES ('global', clock_timestamp(), 1)
  ON CONFLICT (chave) DO UPDATE SET
    inicio_janela = CASE WHEN t.inicio_janela < clock_timestamp() - interval '15 minutes'
      THEN clock_timestamp() ELSE t.inicio_janela END,
    tentativas = CASE WHEN t.inicio_janela < clock_timestamp() - interval '15 minutes'
      THEN 1 ELSE t.tentativas + 1 END
  RETURNING tentativas INTO v_tentativas;
  IF v_tentativas > 300 THEN RETURN NULL; END IF;

  INSERT INTO gestao.limites_sessoes AS t (chave, inicio_janela, tentativas)
  VALUES ('login:' || md5(p_identificador), clock_timestamp(), 1)
  ON CONFLICT (chave) DO UPDATE SET
    inicio_janela = CASE WHEN t.inicio_janela < clock_timestamp() - interval '15 minutes'
      THEN clock_timestamp() ELSE t.inicio_janela END,
    tentativas = CASE WHEN t.inicio_janela < clock_timestamp() - interval '15 minutes'
      THEN 1 ELSE t.tentativas + 1 END
  RETURNING tentativas INTO v_tentativas;
  IF v_tentativas > 5 THEN RETURN NULL; END IF;

  SELECT u.id, v.bcrypt_hash INTO v_usuario_id, v_verificador
  FROM gestao.usuarios u
  JOIN gestao.verificadores_senha v ON v.usuario_id = u.id
  WHERE (u.usuario = p_identificador OR u.email = p_identificador)
    AND u.ativo = true LIMIT 1;

  -- Usuário legado sem verificador bcrypt é negado (migração explícita necessária).
  IF v_usuario_id IS NULL OR
    public.crypt(encode(public.digest(convert_to(p_senha, 'UTF8'), 'sha256'), 'hex'), v_verificador) IS DISTINCT FROM v_verificador THEN
    RETURN NULL;
  END IF;

  INSERT INTO gestao.sessoes(usuario_id, token_hash, expira_em)
  VALUES (v_usuario_id, p_token_hash, clock_timestamp() + interval '8 hours')
  RETURNING id INTO v_sessao_id;
  RETURN v_sessao_id;
EXCEPTION WHEN unique_violation THEN
  RETURN NULL;
END;
$$;

-- Consulta de sessão exige o segredo original; nunca expõe hashes armazenados.
CREATE FUNCTION gestao.buscar_sessao_segura(p_token text)
RETURNS TABLE(id uuid, nome text, papeis text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT u.id, u.nome,
      COALESCE(array_agg(up.papel_codigo) FILTER (WHERE up.papel_codigo IS NOT NULL),
        ARRAY[]::text[]) AS papeis
    FROM gestao.sessoes s
    JOIN gestao.usuarios u ON u.id = s.usuario_id
    LEFT JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
    WHERE s.token_hash = encode(public.digest(p_token, 'sha256'), 'hex')
      AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
      AND u.ativo = true
    GROUP BY u.id, u.nome
    LIMIT 1;
END;
$$;

-- Revogação requer posse do token puro: não basta ler token_hash do banco.
CREATE FUNCTION gestao.revogar_sessao_segura(p_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_hash text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN
    RETURN false;
  END IF;
  v_hash := encode(public.digest(p_token, 'sha256'), 'hex');
  UPDATE gestao.sessoes SET revogada_em = clock_timestamp()
  WHERE token_hash = v_hash AND revogada_em IS NULL;
  RETURN FOUND;
END;
$$;

-- A aplicação não lê hashes de senha. A função exige sessão administrativa
-- ativa, verifica o segredo no banco e retorna apenas booleano.
CREATE FUNCTION gestao.confirmar_senha_admin(p_token text, p_senha text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_verificador text;
  v_tentativas integer;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$'
    OR p_senha IS NULL OR char_length(p_senha) NOT BETWEEN 12 AND 1024 THEN
    RETURN false;
  END IF;

  -- A própria role SQL não pode zerar esse contador.
  INSERT INTO gestao.limites_sessoes AS t (chave, inicio_janela, tentativas)
  VALUES ('admin:' || md5(p_token), clock_timestamp(), 1)
  ON CONFLICT (chave) DO UPDATE SET
    inicio_janela = CASE WHEN t.inicio_janela < clock_timestamp() - interval '15 minutes'
      THEN clock_timestamp() ELSE t.inicio_janela END,
    tentativas = CASE WHEN t.inicio_janela < clock_timestamp() - interval '15 minutes'
      THEN 1 ELSE t.tentativas + 1 END
  RETURNING tentativas INTO v_tentativas;
  IF v_tentativas > 5 THEN RETURN false; END IF;

  SELECT v.bcrypt_hash INTO v_verificador
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id = s.usuario_id
  JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
  JOIN gestao.verificadores_senha v ON v.usuario_id = u.id
  WHERE s.token_hash = encode(public.digest(p_token, 'sha256'), 'hex')
    AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
    AND u.ativo = true AND up.papel_codigo = 'admin'
  LIMIT 1;

  IF v_verificador IS NULL THEN RETURN false; END IF;
  RETURN public.crypt(
    encode(public.digest(convert_to(p_senha, 'UTF8'), 'sha256'), 'hex'),
    v_verificador
  ) = v_verificador;
END;
$$;

REVOKE ALL ON FUNCTION gestao.confirmar_senha_admin(text,text) FROM PUBLIC;

REVOKE ALL ON FUNCTION gestao.emitir_sessao_segura(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION gestao.buscar_sessao_segura(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION gestao.revogar_sessao_segura(text) FROM PUBLIC;
-- Os GRANT/REVOKE de gestao_app ficam em db/grants e no provisionamento inicial,
-- porque migrações rodam antes da criação da role no CI.
-- ===== FIM 008_gestao_sessoes_protegidas.sql =====
INSERT INTO gestao.schema_migrations(versao,checksum)
VALUES ('008_gestao_sessoes_protegidas.sql','2fac4597b7b1a6560798dd8107e81e14868ff62d1fb5b29e5cf842c0dc3b60bc');

-- ===== INÍCIO 009_gestao_aceite_verificado.sql — conteúdo integral do commit de referência =====
-- Uma única senha de entrada: o PostgreSQL deriva o verificador bcrypt privado.
-- Contas legadas conservam senha_hash scrypt até migração operacional.
-- Contas novas passam a autenticar EXCLUSIVAMENTE via gestao.verificadores_senha;
-- senha_hash é NULL para não manter duas representações independentes da senha.
-- A alteração de schema NÃO preenche verificadores de contas legadas.
ALTER TABLE gestao.usuarios ALTER COLUMN senha_hash DROP NOT NULL;

-- Migration 006 criou a assinatura (text,text,text) que aceitava hash externo.
-- Removê-la antes de definir nova função com os mesmos tipos e nova semântica.
DROP FUNCTION gestao.aceitar_convite(text,text,text);

CREATE FUNCTION gestao.aceitar_convite(
  p_token_hash text, p_nome text, p_senha text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_convite gestao.convites%ROWTYPE;
  v_novo_usuario uuid;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR p_nome IS NULL OR char_length(trim(p_nome)) NOT BETWEEN 2 AND 160
    OR p_senha IS NULL OR char_length(p_senha) NOT BETWEEN 12 AND 1024
  THEN
    RETURN NULL;
  END IF;

  SELECT c.* INTO v_convite FROM gestao.convites c
  WHERE c.token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR v_convite.usado_em IS NOT NULL
    OR v_convite.revogado_em IS NOT NULL
    OR v_convite.expira_em <= clock_timestamp() THEN
    RETURN NULL;
  END IF;

  IF v_convite.usuario_existente_id IS NOT NULL THEN
    -- Primeiro acesso: o convite foi emitido por processo DBA controlado,
    -- associado a uma conta admin já existente, ainda sem verificador.
    -- Nunca permitir reativar conta inativa ou redefinir senha já inicializada.
    SELECT u.id INTO v_novo_usuario
    FROM gestao.usuarios u
    JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
    WHERE u.id = v_convite.usuario_existente_id
      AND u.usuario = v_convite.usuario AND u.ativo = true
      AND up.papel_codigo = 'admin' AND v_convite.papel_codigo = 'admin'
    FOR UPDATE OF u;
    IF v_novo_usuario IS NULL OR EXISTS (
      SELECT 1 FROM gestao.verificadores_senha v
      WHERE v.usuario_id = v_novo_usuario
    ) THEN
      RETURN NULL;
    END IF;

    UPDATE gestao.usuarios
    SET nome = trim(p_nome), senha_hash = NULL
    WHERE id = v_novo_usuario;
    INSERT INTO gestao.verificadores_senha (usuario_id, bcrypt_hash)
    VALUES (
      v_novo_usuario,
      public.crypt(
        encode(public.digest(convert_to(p_senha, 'UTF8'), 'sha256'), 'hex'),
        public.gen_salt('bf', 12)
      )
    );
    UPDATE gestao.convites c
    SET usado_em = clock_timestamp(), usuario_criado_id = v_novo_usuario
    WHERE c.id = v_convite.id;
    INSERT INTO gestao.auditoria (ator_id, entidade, entidade_id, acao, detalhes)
    VALUES (v_novo_usuario, 'convite', v_convite.id, 'ativar_admin',
      jsonb_build_object('usuario', v_convite.usuario, 'inicial', true));
    RETURN v_novo_usuario;
  END IF;

  -- Convite padrão: criação exclusiva de uma conta ainda inexistente.
  IF EXISTS (SELECT 1 FROM gestao.usuarios u WHERE u.usuario = v_convite.usuario) THEN
    RETURN NULL;
  END IF;

  -- Não preencher hash scrypt redundante: somente a senha recebida nesta
  -- função determina o verificador autoritativo no banco.
  INSERT INTO gestao.usuarios (nome, usuario)
  VALUES (trim(p_nome), v_convite.usuario)
  RETURNING id INTO v_novo_usuario;

  INSERT INTO gestao.verificadores_senha (usuario_id, bcrypt_hash)
  VALUES (
    v_novo_usuario,
    public.crypt(
      encode(public.digest(convert_to(p_senha, 'UTF8'), 'sha256'), 'hex'),
      public.gen_salt('bf', 12)
    )
  );

  INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo)
  VALUES (v_novo_usuario, v_convite.papel_codigo);

  UPDATE gestao.convites c
  SET usado_em = clock_timestamp(), usuario_criado_id = v_novo_usuario
  WHERE c.id = v_convite.id;

  INSERT INTO gestao.auditoria (ator_id, entidade, entidade_id, acao, detalhes)
  VALUES (v_novo_usuario, 'convite', v_convite.id, 'aceitar',
    jsonb_build_object('usuario', v_convite.usuario, 'papel', v_convite.papel_codigo));
  RETURN v_novo_usuario;
EXCEPTION WHEN unique_violation THEN
  RETURN NULL;
END;
$$;

-- Funções PostgreSQL têm EXECUTE para PUBLIC por padrão.
REVOKE ALL ON FUNCTION gestao.aceitar_convite(text,text,text) FROM PUBLIC;
-- ===== FIM 009_gestao_aceite_verificado.sql =====
INSERT INTO gestao.schema_migrations(versao,checksum)
VALUES ('009_gestao_aceite_verificado.sql','a6b63cbf09815e79ed5429e5f8e1f26ccfb2b31aaca8313df50a0a40416ca4e1');

-- O arquivo db/grants/gestao-app.sql usa sintaxe exclusiva do psql (:app_role).
-- Abaixo a forma SQL equivalente, usando o papel fixo previamente conferido.
REVOKE ALL ON SCHEMA gestao FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA gestao FROM PUBLIC;
GRANT USAGE ON SCHEMA gestao TO gestao_app;
REVOKE SELECT ON gestao.usuarios, gestao.usuarios_papeis FROM gestao_app;
REVOKE SELECT, INSERT, UPDATE, DELETE ON gestao.sessoes FROM gestao_app;
GRANT EXECUTE ON FUNCTION gestao.emitir_sessao_segura(text,text,text) TO gestao_app;
GRANT EXECUTE ON FUNCTION gestao.buscar_sessao_segura(text) TO gestao_app;
GRANT EXECUTE ON FUNCTION gestao.revogar_sessao_segura(text) TO gestao_app;
GRANT EXECUTE ON FUNCTION gestao.confirmar_senha_admin(text,text) TO gestao_app;
GRANT SELECT, INSERT ON gestao.clientes, gestao.leads TO gestao_app;
GRANT SELECT, INSERT, UPDATE ON gestao.tentativas_login TO gestao_app;
REVOKE EXECUTE ON FUNCTION gestao.emitir_convite(text,text,text,text) FROM gestao_app;
REVOKE EXECUTE ON FUNCTION gestao.revogar_convite(text,uuid) FROM gestao_app;
REVOKE EXECUTE ON FUNCTION gestao.listar_convites(text) FROM gestao_app;
GRANT EXECUTE ON FUNCTION gestao.aceitar_convite(text,text,text) TO gestao_app;

DO $postflight$
BEGIN
  IF (SELECT COUNT(*) FROM gestao.schema_migrations) <> 9 THEN
    RAISE EXCEPTION 'BLOQUEIO: migrations aplicadas não totalizam 9';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pgcrypto') THEN
    RAISE EXCEPTION 'BLOQUEIO: pgcrypto não instalada';
  END IF;
  IF NOT has_function_privilege('gestao_app', 'gestao.emitir_sessao_segura(text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('gestao_app', 'gestao.aceitar_convite(text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('gestao_app', 'gestao.confirmar_senha_admin(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'BLOQUEIO: funções obrigatórias não concedidas';
  END IF;
  IF has_table_privilege('gestao_app', 'gestao.sessoes', 'SELECT')
     OR has_table_privilege('gestao_app', 'gestao.sessoes', 'INSERT')
     OR has_table_privilege('gestao_app', 'gestao.usuarios', 'SELECT')
     OR has_table_privilege('gestao_app', 'gestao.usuarios_papeis', 'SELECT')
     OR has_table_privilege('gestao_app', 'gestao.verificadores_senha', 'SELECT')
     OR has_function_privilege('gestao_app', 'gestao.emitir_convite(text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'BLOQUEIO: role gestao_app com privilégio excessivo';
  END IF;
END;
$postflight$;

COMMIT;

-- Após conclusão confirme 001–009, extensão e privilégios em SELECT read-only.
-- Os dois administradores legados continuarão SEM verifier até o primeiro convite.
-- A role gestao_convites e DATABASE_URL_CONVITES serão feitas em outra operação privada.
-- Nunca ligar GESTAO_HABILITADA / GESTAO_CONVITES_HABILITADOS antes disso.
