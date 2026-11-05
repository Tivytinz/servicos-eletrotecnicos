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
