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

REVOKE ALL ON FUNCTION gestao.emitir_sessao_segura(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION gestao.revogar_sessao_segura(text) FROM PUBLIC;
-- Os GRANT/REVOKE de gestao_app ficam em db/grants e no provisionamento inicial,
-- porque migrações rodam antes da criação da role no CI.
