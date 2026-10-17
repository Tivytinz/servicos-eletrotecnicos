-- Novos convites passam a cadastrar credencial SQL bcrypt junto com scrypt.
-- Compatibilidade de hashes scrypt para contas legadas preservada; login seguro
-- requer verificador DB preenchido separadamente para contas antigas.
CREATE FUNCTION gestao.aceitar_convite(
  p_token_hash text, p_nome text, p_scrypt_hash text, p_senha text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_convite gestao.convites%ROWTYPE;
  v_novo_usuario uuid;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR p_nome IS NULL OR char_length(trim(p_nome)) NOT BETWEEN 2 AND 160
    OR p_scrypt_hash IS NULL OR p_scrypt_hash !~ '^scrypt[$]16384[$]8[$]1[$][a-f0-9]{32}[$][a-f0-9]{128}$'
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

  INSERT INTO gestao.usuarios (nome, usuario, senha_hash)
  VALUES (trim(p_nome), v_convite.usuario, p_scrypt_hash)
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

REVOKE ALL ON FUNCTION gestao.aceitar_convite(text,text,text,text) FROM PUBLIC;

-- Remover definitivamente o fluxo antigo que aceitava somente hash fornecido
-- pela aplicação, sem criar um verificador seguro para login.
DROP FUNCTION gestao.aceitar_convite(text,text,text);
