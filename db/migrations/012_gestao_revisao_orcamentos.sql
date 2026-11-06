-- Eletrotécnico GO — revisão versionada de rascunhos (release 012).
-- Preserva versões anteriores. Não envia propostas nem registra aceite de clientes.
CREATE FUNCTION gestao.revisar_orcamento_rascunho(
  p_token text, p_orcamento_id uuid, p_versao_esperada integer,
  p_valor_centavos bigint, p_descricao text, p_validade date
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ator uuid;
  v_atual integer;
  v_status text;
  v_lead_status text;
  v_nova integer;
  v_hoje date := (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$'
    OR p_orcamento_id IS NULL OR p_versao_esperada IS NULL
    OR p_versao_esperada < 1 OR p_versao_esperada >= 2147483647
    OR p_valor_centavos IS NULL OR p_valor_centavos < 1
    OR p_valor_centavos > 9999999999
    OR p_descricao IS NULL OR length(btrim(p_descricao)) NOT BETWEEN 10 AND 4000
    OR p_validade IS NULL OR p_validade < v_hoje OR p_validade > v_hoje + 180
  THEN
    RETURN NULL;
  END IF;

  SELECT u.id INTO v_ator
  FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id = s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id = u.id
  WHERE s.token_hash = encode(public.digest(p_token,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em > clock_timestamp()
    AND u.ativo = true AND p.papel_codigo IN ('admin','comercial')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN NULL; END IF;

  -- Serializa revisões e impede perder alterações concorrentes.
  SELECT o.versao_atual, o.status, l.status
  INTO v_atual, v_status, v_lead_status
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id = o.lead_id
  WHERE o.id = p_orcamento_id
  FOR UPDATE OF o;
  IF v_atual IS NULL OR v_atual <> p_versao_esperada
    OR v_status <> 'rascunho' OR v_lead_status <> 'orcamento_em_preparo'
  THEN
    RETURN NULL;
  END IF;

  v_nova := v_atual + 1;
  INSERT INTO gestao.orcamento_versoes
    (orcamento_id,versao,valor_centavos,descricao,validade_em)
  VALUES (
    p_orcamento_id,v_nova,p_valor_centavos,btrim(p_descricao),
    (p_validade + interval '1 day') AT TIME ZONE 'America/Sao_Paulo'
  );
  UPDATE gestao.orcamentos SET versao_atual=v_nova WHERE id=p_orcamento_id;

  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (v_ator,'orcamento',p_orcamento_id,'revisar_rascunho',
    jsonb_build_object('versao_anterior',v_atual,'versao_nova',v_nova));
  RETURN v_nova;
END;
$$;
REVOKE ALL ON FUNCTION gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date) TO gestao_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.revisar_orcamento_rascunho(text,uuid,integer,bigint,text,date) FROM gestao_convites;
  END IF;
END
$grants$;
