/** SQL atômico de convites; os parâmetros são vinculados, nunca interpolados. */
export const SQL_EMITIR_CONVITE = `
  INSERT INTO gestao.convites (token_hash, usuario, papel_codigo, criado_por, expira_em)
  SELECT $1, $2, $3, $4, now() + interval '24 hours'
  WHERE EXISTS (
    SELECT 1 FROM gestao.usuarios u
    JOIN gestao.usuarios_papeis p ON p.usuario_id = u.id
    WHERE u.id = $4 AND u.ativo = true AND p.papel_codigo = 'admin'
  )
  AND NOT EXISTS (SELECT 1 FROM gestao.usuarios WHERE usuario = $2)
  RETURNING id, usuario, papel_codigo, expira_em
`;

/**
 * Aceite em uma única instrução e transação implícita PostgreSQL.
 * O FOR UPDATE impede que duas aceitações consumam o mesmo convite.
 * Não expor a execução desta query a clientes; hash de senha pré-calculado no servidor.
 */
export const SQL_ACEITAR_CONVITE = `
  WITH disponivel AS MATERIALIZED (
    SELECT c.id, c.usuario, c.papel_codigo
    FROM gestao.convites c
    WHERE c.token_hash = $1 AND c.usado_em IS NULL
      AND c.revogado_em IS NULL AND c.expira_em > now()
      AND NOT EXISTS (SELECT 1 FROM gestao.usuarios u WHERE u.usuario = c.usuario)
    FOR UPDATE OF c
  ),
  novo_usuario AS (
    INSERT INTO gestao.usuarios (nome, usuario, senha_hash)
    SELECT $2, d.usuario, $3 FROM disponivel d
    RETURNING id, usuario
  ),
  novo_papel AS (
    INSERT INTO gestao.usuarios_papeis (usuario_id, papel_codigo)
    SELECT u.id, d.papel_codigo FROM novo_usuario u JOIN disponivel d ON d.usuario = u.usuario
    RETURNING usuario_id
  )
  UPDATE gestao.convites c
  SET usado_em = now(), usuario_criado_id = u.id
  FROM disponivel d JOIN novo_usuario u ON u.usuario = d.usuario
    JOIN novo_papel p ON p.usuario_id = u.id
  WHERE c.id = d.id
  RETURNING u.id AS usuario_id, u.usuario
`;

/** Revogação apenas pelo administrador que emitiu ou por outro administrador ativo. */
export const SQL_REVOGAR_CONVITE = `
  UPDATE gestao.convites SET revogado_em = now()
  WHERE id = $1 AND usado_em IS NULL AND revogado_em IS NULL
    AND EXISTS (
      SELECT 1 FROM gestao.usuarios u JOIN gestao.usuarios_papeis p ON p.usuario_id = u.id
      WHERE u.id = $2 AND u.ativo = true AND p.papel_codigo = 'admin'
    )
  RETURNING id
`;
