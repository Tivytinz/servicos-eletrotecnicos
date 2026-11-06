-- Eletrotécnico GO · revisão não destrutiva dos logins administrativos.
-- SOMENTE SELECT. Não mostra identificadores internos, hashes, senhas nem tokens.
-- Execute com o Postgres do Railway para revisar os acessos antes de qualquer desativação.
WITH nomes(usuario) AS (
  VALUES ('victor'), ('carlos'), ('admin')
)
SELECT
  n.usuario,
  u.id IS NOT NULL AS conta_existe,
  COALESCE(u.ativo, false) AS conta_ativa,
  EXISTS (
    SELECT 1 FROM gestao.usuarios_papeis p
    WHERE p.usuario_id = u.id AND p.papel_codigo = 'admin'
  ) AS perfil_admin,
  EXISTS (
    SELECT 1 FROM gestao.verificadores_senha v
    WHERE v.usuario_id = u.id
  ) AS senha_pessoal_ativada,
  (SELECT COUNT(*) FROM gestao.sessoes s WHERE s.usuario_id = u.id
     AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()) AS sessoes_ativas,
  (SELECT COUNT(*) FROM gestao.convites c WHERE c.usuario = n.usuario
     AND c.usado_em IS NULL AND c.revogado_em IS NULL
     AND c.expira_em > clock_timestamp()) AS convites_pendentes,
  EXISTS (
    SELECT 1 FROM gestao.convites c
    WHERE c.usuario = n.usuario AND c.usuario_criado_id = u.id
      AND c.usado_em IS NOT NULL AND c.revogado_em IS NULL
  ) AS ativada_por_convite
FROM nomes n
LEFT JOIN gestao.usuarios u ON u.usuario = n.usuario
ORDER BY CASE n.usuario WHEN 'victor' THEN 1 WHEN 'carlos' THEN 2 ELSE 3 END;
