-- Eletrotécnico GO — nova release 016: planejamento de OS.
-- A proposta anterior de segundo fator (PR #77) foi encerrada SEM merge;
-- por isso a próxima migration de main continua sendo 016.
-- O planejamento NÃO converte OS em agendada ou executável.
-- Não modifica financeiro, não envia mensagens e não agenda atendimento confirmado.

CREATE TABLE gestao.os_planejamento_016 (
  os_id uuid PRIMARY KEY REFERENCES gestao.ordens_servico(id),
  tecnico_id uuid NOT NULL REFERENCES gestao.usuarios(id),
  data_prevista date NOT NULL,
  observacao text NOT NULL DEFAULT ''
    CHECK (char_length(observacao) <= 500),
  revisao integer NOT NULL DEFAULT 1 CHECK (revisao BETWEEN 1 AND 2147483646),
  atualizado_por uuid NOT NULL REFERENCES gestao.usuarios(id),
  atualizado_em timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON gestao.os_planejamento_016 FROM PUBLIC;
CREATE INDEX idx_os_planejamento_016_tecnico_data
  ON gestao.os_planejamento_016(tecnico_id,data_prevista);

-- Apenas admin atribui um membro ativo da equipe técnica e uma DATA PREVISTA.
-- O cliente não recebe confirmação, o status permanece "pendente".
-- Controle de versão impede salvar por formulário desatualizado.
CREATE FUNCTION gestao.planejar_os_pendente_016(
  p_sessao text,p_os uuid,p_tecnico uuid,p_data date,
  p_observacao text,p_revisao_esperada integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_ator uuid;
  v_status text;
  v_agendada timestamptz;
  v_versao integer;
  v_orcamento uuid;
  v_status_orcamento text;
  v_status_lead text;
  v_versao_atual integer;
  v_revisao integer;
  v_nova_revisao integer;
  v_hoje date;
BEGIN
  IF p_sessao IS NULL OR p_sessao !~ '^[A-Za-z0-9_-]{43}$'
    OR p_os IS NULL OR p_tecnico IS NULL OR p_data IS NULL
    OR p_observacao IS NULL OR char_length(p_observacao) > 500
    OR p_revisao_esperada IS NULL OR p_revisao_esperada < 0
    OR p_revisao_esperada > 2147483645
  THEN RETURN false; END IF;

  v_hoje := (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date;
  IF p_data < v_hoje OR p_data > v_hoje + 365 THEN RETURN false; END IF;

  SELECT u.id INTO v_ator FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id=s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
  WHERE s.token_hash=encode(public.digest(p_sessao,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
    AND u.ativo=true AND p.papel_codigo='admin'
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN false; END IF;

  -- Locks na OS serializam edições concorrentes.
  SELECT os.status,os.agendada_para,os.versao_aprovada,os.orcamento_id
  INTO v_status,v_agendada,v_versao,v_orcamento
  FROM gestao.ordens_servico os WHERE os.id=p_os FOR UPDATE;
  IF v_status IS NULL OR v_status <> 'pendente' OR v_agendada IS NOT NULL
  THEN RETURN false; END IF;

  SELECT o.status,l.status,o.versao_atual
    INTO v_status_orcamento,v_status_lead,v_versao_atual
  FROM gestao.orcamentos o JOIN gestao.leads l ON l.id=o.lead_id
  WHERE o.id=v_orcamento;
  IF v_status_orcamento <> 'aprovado'
    OR v_status_lead <> 'aprovado' OR v_versao_atual <> v_versao
    OR NOT EXISTS (
      SELECT 1 FROM gestao.orcamento_versoes v
      WHERE v.orcamento_id=v_orcamento AND v.versao=v_versao
        AND v.aprovado_em IS NOT NULL
    )
  THEN RETURN false; END IF;

  -- O admin designa SOMENTE usuário ativo com papel técnico.
  IF NOT EXISTS (
    SELECT 1 FROM gestao.usuarios u
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE u.id=p_tecnico AND u.ativo=true AND p.papel_codigo='tecnico'
  ) THEN RETURN false; END IF;

  SELECT revisao INTO v_revisao FROM gestao.os_planejamento_016 WHERE os_id=p_os;
  IF v_revisao IS NULL THEN
    IF p_revisao_esperada<>0 THEN RETURN false; END IF;
    INSERT INTO gestao.os_planejamento_016
      (os_id,tecnico_id,data_prevista,observacao,revisao,atualizado_por)
    VALUES(p_os,p_tecnico,p_data,btrim(p_observacao),1,v_ator);
    v_nova_revisao:=1;
  ELSE
    IF v_revisao<>p_revisao_esperada THEN RETURN false; END IF;
    UPDATE gestao.os_planejamento_016
    SET tecnico_id=p_tecnico,data_prevista=p_data,
      observacao=btrim(p_observacao),revisao=v_revisao+1,
      atualizado_por=v_ator,atualizado_em=clock_timestamp()
    WHERE os_id=p_os;
    v_nova_revisao:=v_revisao+1;
  END IF;

  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES(v_ator,'os',p_os,'planejar_os_016',
    jsonb_build_object('tecnico_id',p_tecnico,'data_prevista',p_data,
      'revisao_anterior',p_revisao_esperada,'revisao',v_nova_revisao,
      'status','pendente','agendamento_confirmado',false));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION gestao.planejar_os_pendente_016(text,uuid,uuid,date,text,integer)
  FROM PUBLIC;

-- Técnicos são listados somente para admin autenticado; nunca expõe senha,
-- contatos, login, token ou outros campos da tabela de usuários.
CREATE FUNCTION gestao.listar_tecnicos_os_016(p_sessao text)
RETURNS TABLE(id uuid,nome text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF p_sessao IS NULL OR p_sessao !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM gestao.sessoes s
    JOIN gestao.usuarios u ON u.id=s.usuario_id
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE s.token_hash=encode(public.digest(p_sessao,'sha256'),'hex')
      AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
      AND u.ativo=true AND p.papel_codigo='admin'
  ) THEN RETURN; END IF;
  RETURN QUERY
  SELECT u.id,u.nome FROM gestao.usuarios u
  JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
  WHERE u.ativo=true AND p.papel_codigo='tecnico'
  ORDER BY u.nome,u.id LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION gestao.listar_tecnicos_os_016(text) FROM PUBLIC;

CREATE FUNCTION gestao.listar_os_planejamento_016(p_sessao text)
RETURNS TABLE(
  id uuid,orcamento_id uuid,versao integer,cliente_nome text,
  status text,valor_centavos bigint,criada_em timestamptz,
  tecnico_id uuid,tecnico_nome text,data_prevista date,
  observacao text,revisao integer
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF p_sessao IS NULL OR p_sessao !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM gestao.sessoes s
    JOIN gestao.usuarios u ON u.id=s.usuario_id
    JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
    WHERE s.token_hash=encode(public.digest(p_sessao,'sha256'),'hex')
      AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
      AND u.ativo=true AND p.papel_codigo IN ('admin','tecnico')
  ) THEN RETURN; END IF;
  RETURN QUERY
  SELECT os.id,os.orcamento_id,os.versao_aprovada,c.nome,
    os.status,v.valor_centavos,os.criada_em,pl.tecnico_id,t.nome,
    pl.data_prevista,pl.observacao,COALESCE(pl.revisao,0)
  FROM gestao.ordens_servico os
  JOIN gestao.orcamentos o ON o.id=os.orcamento_id
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.clientes c ON c.id=l.cliente_id
  JOIN gestao.orcamento_versoes v
    ON v.orcamento_id=os.orcamento_id AND v.versao=os.versao_aprovada
  LEFT JOIN gestao.os_planejamento_016 pl ON pl.os_id=os.id
  LEFT JOIN gestao.usuarios t ON t.id=pl.tecnico_id
  WHERE os.status='pendente'
  ORDER BY os.criada_em DESC,os.id DESC LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION gestao.listar_os_planejamento_016(text) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.planejar_os_pendente_016(text,uuid,uuid,date,text,integer)
      TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.listar_tecnicos_os_016(text) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.listar_os_planejamento_016(text) TO gestao_app;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.planejar_os_pendente_016(text,uuid,uuid,date,text,integer)
      FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.listar_tecnicos_os_016(text) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.listar_os_planejamento_016(text) FROM gestao_convites;
  END IF;
END
$grants$;
