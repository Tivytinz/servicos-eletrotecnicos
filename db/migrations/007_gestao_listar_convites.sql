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
