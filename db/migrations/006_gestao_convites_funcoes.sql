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
