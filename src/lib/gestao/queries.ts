/** SQL parametrizado compartilhado pela aplicação e pelos testes de integração. */
export const SQL_BUSCAR_SESSAO = `
  SELECT u.id, u.nome,
    COALESCE(array_agg(up.papel_codigo) FILTER (WHERE up.papel_codigo IS NOT NULL),
      ARRAY[]::text[]) AS papeis
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id = s.usuario_id
  LEFT JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
  WHERE s.token_hash = $1 AND s.revogada_em IS NULL
    AND s.expira_em > now() AND u.ativo = true
  GROUP BY u.id, u.nome
  LIMIT 1
`;

export const SQL_LIMITAR_LOGIN = `
  INSERT INTO gestao.tentativas_login AS t (chave_hash, inicio_janela, tentativas)
  VALUES ($1, now(), 1)
  ON CONFLICT (chave_hash) DO UPDATE SET
    inicio_janela = CASE WHEN t.inicio_janela < now() - interval '15 minutes'
      THEN now() ELSE t.inicio_janela END,
    tentativas = CASE WHEN t.inicio_janela < now() - interval '15 minutes'
      THEN 1 ELSE t.tentativas + 1 END
  RETURNING tentativas
`;

export const SQL_CADASTRAR_LEAD = `
  WITH cliente AS (
    INSERT INTO gestao.clientes (nome, telefone) VALUES ($1, $2)
    RETURNING id
  )
  INSERT INTO gestao.leads (cliente_id, origem, descricao)
  SELECT id, $3, $4 FROM cliente
  RETURNING id, cliente_id
`;
