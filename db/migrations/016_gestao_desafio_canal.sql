-- Release 016-B: desafios para canal previamente vinculado, somente em branch.
-- Política inicialmente OFF. Nenhuma escrita financeira, agendamento ou OS executável.
-- Nenhum cadastro de contato via aplicativo neste incremento: sem prova externa,
-- `gestao.canais_vinculados_016` não pode ser marcado como verificado.
-- A PR não autoriza aplicar esta migration na produção.

CREATE TABLE gestao.politica_canal_016 (
  chave boolean PRIMARY KEY DEFAULT true CHECK (chave),
  obrigatorio boolean NOT NULL DEFAULT false
);
INSERT INTO gestao.politica_canal_016(chave,obrigatorio) VALUES(true,false);
REVOKE ALL ON gestao.politica_canal_016 FROM PUBLIC;

CREATE TABLE gestao.canais_vinculados_016 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES gestao.clientes(id),
  tipo text NOT NULL CHECK(tipo IN ('telefone','whatsapp','email')),
  destino_hash text NOT NULL CHECK(destino_hash ~ '^[a-f0-9]{64}$'),
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  verificado_em timestamptz,
  verificado_por uuid REFERENCES gestao.usuarios(id),
  metodo_vinculacao text,
  revogado_em timestamptz,
  CONSTRAINT comprovacao_vinculo_016 CHECK (
    (verificado_em IS NULL AND verificado_por IS NULL AND metodo_vinculacao IS NULL)
    OR (verificado_em IS NOT NULL AND verificado_por IS NOT NULL
      AND metodo_vinculacao IN ('prova_independente_documentada'))
  ),
  CONSTRAINT revogacao_vinculo_016 CHECK (
    revogado_em IS NULL OR revogado_em >= criado_em
  ),
  UNIQUE(cliente_id,tipo,destino_hash)
);
REVOKE ALL ON gestao.canais_vinculados_016 FROM PUBLIC;
CREATE INDEX idx_canais_016_cliente ON gestao.canais_vinculados_016(cliente_id);

CREATE TABLE gestao.limites_desafio_016 (
  orcamento_id uuid NOT NULL,
  versao integer NOT NULL,
  falhas integer NOT NULL DEFAULT 0 CHECK(falhas BETWEEN 0 AND 5),
  ultima_falha_em timestamptz,
  PRIMARY KEY(orcamento_id,versao),
  FOREIGN KEY(orcamento_id,versao)
    REFERENCES gestao.orcamento_versoes(orcamento_id,versao)
);
REVOKE ALL ON gestao.limites_desafio_016 FROM PUBLIC;

CREATE TABLE gestao.desafios_canal_016 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES gestao.links_aceite_cliente(id),
  canal_id uuid NOT NULL REFERENCES gestao.canais_vinculados_016(id),
  codigo_hash text NOT NULL UNIQUE CHECK(codigo_hash ~ '^[a-f0-9]{64}$'),
  emitido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  expira_em timestamptz NOT NULL,
  utilizado_em timestamptz,
  revogado_em timestamptz,
  CONSTRAINT prazo_desafio_016 CHECK (
    expira_em > emitido_em AND expira_em <= emitido_em + interval '10 minutes'
  ),
  CONSTRAINT estado_desafio_016 CHECK (
    utilizado_em IS NULL OR revogado_em IS NULL
  )
);
CREATE UNIQUE INDEX idx_desafio_ativo_por_link_016
  ON gestao.desafios_canal_016(link_id)
  WHERE utilizado_em IS NULL AND revogado_em IS NULL;
REVOKE ALL ON gestao.desafios_canal_016 FROM PUBLIC;

-- A emissão requer a política ativada, papel autorizado, proposta enviada,
-- link ativo, canal comprovado anteriormente e orçamento não bloqueado.
-- Segredo bruto nunca é persistido ou devolvido pela função SQL.
CREATE FUNCTION gestao.emitir_desafio_canal_016(
  p_sessao text,p_orcamento uuid,p_versao integer,p_canal uuid,p_codigo_hash text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_ator uuid; v_cliente uuid; v_versao integer;
  v_orc_status text; v_lead_status text; v_validade timestamptz;
  v_link uuid; v_expira_link timestamptz; v_agora timestamptz;
  v_falhas integer; v_desafio uuid; v_expira timestamptz;
BEGIN
  IF p_sessao IS NULL OR p_sessao !~ '^[A-Za-z0-9_-]{43}$'
    OR p_orcamento IS NULL OR p_versao IS NULL OR p_versao<1
    OR p_canal IS NULL OR p_codigo_hash IS NULL
    OR p_codigo_hash !~ '^[a-f0-9]{64}$'
    OR NOT EXISTS (
      SELECT 1 FROM gestao.politica_canal_016
      WHERE chave=true AND obrigatorio=true
    )
  THEN RETURN NULL; END IF;

  SELECT u.id INTO v_ator FROM gestao.sessoes s
  JOIN gestao.usuarios u ON u.id=s.usuario_id
  JOIN gestao.usuarios_papeis p ON p.usuario_id=u.id
  WHERE s.token_hash=encode(public.digest(p_sessao,'sha256'),'hex')
    AND s.revogada_em IS NULL AND s.expira_em>clock_timestamp()
    AND u.ativo=true AND p.papel_codigo IN ('admin','comercial')
  LIMIT 1;
  IF v_ator IS NULL THEN RETURN NULL; END IF;

  SELECT o.versao_atual,o.status,l.status,l.cliente_id,v.validade_em
    INTO v_versao,v_orc_status,v_lead_status,v_cliente,v_validade
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.orcamento_versoes v ON v.orcamento_id=o.id
    AND v.versao=o.versao_atual
  WHERE o.id=p_orcamento FOR UPDATE OF o,l;
  v_agora:=clock_timestamp();
  IF v_versao IS NULL OR v_versao<>p_versao
    OR v_orc_status<>'enviado' OR v_lead_status<>'orcamento_enviado'
    OR v_validade IS NULL OR v_validade<=v_agora + interval '1 minute'
  THEN RETURN NULL; END IF;

  SELECT a.id,a.expira_em INTO v_link,v_expira_link
  FROM gestao.links_aceite_cliente a
  WHERE a.orcamento_id=p_orcamento AND a.versao=p_versao
    AND a.revogado_em IS NULL AND a.utilizado_em IS NULL
    AND a.expira_em>v_agora + interval '1 second'
  FOR UPDATE;
  IF v_link IS NULL THEN RETURN NULL; END IF;

  -- Nenhum canal do cadastro puro é automaticamente verificado.
  PERFORM 1 FROM gestao.canais_vinculados_016 c
  WHERE c.id=p_canal AND c.cliente_id=v_cliente
    AND c.verificado_em IS NOT NULL AND c.revogado_em IS NULL
    AND c.metodo_vinculacao='prova_independente_documentada'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO gestao.limites_desafio_016(orcamento_id,versao)
  VALUES(p_orcamento,p_versao) ON CONFLICT DO NOTHING;
  SELECT falhas INTO v_falhas FROM gestao.limites_desafio_016
  WHERE orcamento_id=p_orcamento AND versao=p_versao FOR UPDATE;
  IF v_falhas>=5 THEN RETURN NULL; END IF;

  -- Reemissão com o mesmo link revoga o desafio anterior.
  UPDATE gestao.desafios_canal_016
  SET revogado_em=v_agora WHERE link_id=v_link
    AND utilizado_em IS NULL AND revogado_em IS NULL;
  v_expira:=LEAST(v_agora+interval '10 minutes',v_expira_link,v_validade);
  IF v_expira<=v_agora THEN RETURN NULL; END IF;
  INSERT INTO gestao.desafios_canal_016(
    link_id,canal_id,codigo_hash,emitido_em,expira_em
  ) VALUES(v_link,p_canal,p_codigo_hash,v_agora,v_expira)
  RETURNING id INTO v_desafio;
  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES(v_ator,'orcamento',p_orcamento,'emitir_desafio_canal_016',
    jsonb_build_object('versao',p_versao,'canal_id',p_canal,
      'desafio_id',v_desafio,'expira_em',v_expira));
  RETURN v_desafio;
END;
$$;
REVOKE ALL ON FUNCTION gestao.emitir_desafio_canal_016(text,uuid,integer,uuid,text) FROM PUBLIC;

-- Resposta atômica: código correto + link válido + canal já vinculado +
-- status/versão íntegros. Erro eleva contador da proposta, não do desafio.
-- Reemissão de desafios não zera as 5 tentativas acumuladas por versão.
CREATE FUNCTION gestao.responder_link_desafio_016(
  p_hash_link text,p_hash_codigo text,p_resposta text,p_leu_condicoes boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_orcamento uuid; v_lead uuid; v_versao integer;
  v_orc_status text; v_lead_status text; v_validade timestamptz;
  v_link gestao.links_aceite_cliente%ROWTYPE;
  v_desafio gestao.desafios_canal_016%ROWTYPE;
  v_canal gestao.canais_vinculados_016%ROWTYPE;
  v_falhas integer; v_agora timestamptz; v_novo_status text;
BEGIN
  IF p_hash_link IS NULL OR p_hash_link !~ '^[a-f0-9]{64}$'
    OR p_hash_codigo IS NULL OR p_hash_codigo !~ '^[a-f0-9]{64}$'
    OR p_resposta IS NULL OR p_resposta NOT IN ('aprovacao','recusa')
    OR p_leu_condicoes IS DISTINCT FROM true
    OR NOT EXISTS(
      SELECT 1 FROM gestao.politica_canal_016
      WHERE chave=true AND obrigatorio=true
    )
  THEN RETURN false; END IF;
  SELECT a.orcamento_id INTO v_orcamento
  FROM gestao.links_aceite_cliente a WHERE a.token_hash=p_hash_link;
  IF v_orcamento IS NULL THEN RETURN false; END IF;

  -- Ordem comum de bloqueios: orçamento/lead -> link -> canal -> limite -> desafio.
  SELECT o.lead_id,o.versao_atual,o.status,l.status,v.validade_em
    INTO v_lead,v_versao,v_orc_status,v_lead_status,v_validade
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.orcamento_versoes v ON v.orcamento_id=o.id
    AND v.versao=o.versao_atual
  WHERE o.id=v_orcamento FOR UPDATE OF o,l;
  SELECT * INTO v_link FROM gestao.links_aceite_cliente
  WHERE token_hash=p_hash_link FOR UPDATE;
  v_agora:=clock_timestamp();
  IF v_versao IS NULL OR v_link.id IS NULL OR v_link.versao<>v_versao
    OR v_link.revogado_em IS NOT NULL OR v_link.utilizado_em IS NOT NULL
    OR v_agora>=v_link.expira_em OR v_validade IS NULL
    OR v_agora>=v_validade OR v_orc_status<>'enviado'
    OR v_lead_status<>'orcamento_enviado'
  THEN RETURN false; END IF;

  -- Lê a referência sem bloquear e confirma de novo após adquirir os locks.
  -- Mantém a mesma ordem de emissão: orçamento, link, canal, limite, desafio.
  SELECT * INTO v_desafio FROM gestao.desafios_canal_016
  WHERE link_id=v_link.id AND revogado_em IS NULL AND utilizado_em IS NULL;
  IF v_desafio.id IS NULL THEN RETURN false; END IF;

  SELECT * INTO v_canal FROM gestao.canais_vinculados_016
  WHERE id=v_desafio.canal_id FOR UPDATE;
  IF v_canal.id IS NULL OR v_canal.revogado_em IS NOT NULL
    OR v_canal.verificado_em IS NULL
    OR v_canal.metodo_vinculacao<>'prova_independente_documentada'
    OR NOT EXISTS (
      SELECT 1 FROM gestao.leads l
      WHERE l.id=v_lead AND l.cliente_id=v_canal.cliente_id
    )
  THEN RETURN false; END IF;

  SELECT falhas INTO v_falhas FROM gestao.limites_desafio_016
  WHERE orcamento_id=v_orcamento AND versao=v_versao FOR UPDATE;
  IF v_falhas IS NULL OR v_falhas>=5 THEN RETURN false; END IF;

  SELECT * INTO v_desafio FROM gestao.desafios_canal_016
  WHERE id=v_desafio.id AND link_id=v_link.id
    AND canal_id=v_canal.id AND revogado_em IS NULL AND utilizado_em IS NULL
  FOR UPDATE;
  IF v_desafio.id IS NULL OR v_agora>=v_desafio.expira_em
  THEN RETURN false; END IF;

  IF v_desafio.codigo_hash<>p_hash_codigo THEN
    UPDATE gestao.limites_desafio_016
    SET falhas=falhas+1,ultima_falha_em=v_agora
    WHERE orcamento_id=v_orcamento AND versao=v_versao;
    RETURN false;
  END IF;

  v_novo_status:=CASE WHEN p_resposta='aprovacao' THEN 'aprovado' ELSE 'recusado' END;
  UPDATE gestao.desafios_canal_016 SET utilizado_em=v_agora WHERE id=v_desafio.id;
  UPDATE gestao.links_aceite_cliente SET utilizado_em=v_agora,resposta=p_resposta
    WHERE id=v_link.id;
  UPDATE gestao.orcamentos SET status=v_novo_status WHERE id=v_orcamento;
  UPDATE gestao.leads SET status=v_novo_status WHERE id=v_lead;
  IF p_resposta='aprovacao' THEN
    UPDATE gestao.orcamento_versoes
    SET aprovado_em=v_agora,
      aprovado_por='Detentor do link e canal vinculado (identidade civil não verificada)'
    WHERE orcamento_id=v_orcamento AND versao=v_versao;
  END IF;
  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES(NULL,'orcamento',v_orcamento,'resposta_desafio_canal_016',
    jsonb_build_object('versao',v_versao,'resposta',p_resposta,
      'desafio_id',v_desafio.id,'canal_id',v_canal.id,
      'posse_canal_confirmada',true,'identidade_verificada',false));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION gestao.responder_link_desafio_016(text,text,text,boolean) FROM PUBLIC;

-- O modo 016 ligado desativa a antiga função de aceite 015 no próprio banco.
-- Com a política DESLIGADA, o comportamento legado é preservado integralmente.
CREATE OR REPLACE FUNCTION gestao.responder_link_aceite_cliente(
  p_hash text,p_resposta text,p_leu_condicoes boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  v_orcamento uuid; v_lead uuid; v_atual integer; v_status text;
  v_lead_status text; v_validade timestamptz;
  v_link gestao.links_aceite_cliente%ROWTYPE;
  v_agora timestamptz; v_status_novo text;
BEGIN
  -- Guarda no PostgreSQL: quando 016 for ativada operacionalmente,
  -- a função pública 015 não pode contornar o desafio independente.
  IF EXISTS (SELECT 1 FROM gestao.politica_canal_016 WHERE chave=true AND obrigatorio=true)
  THEN RETURN false; END IF;
  IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$'
    OR p_resposta IS NULL OR p_resposta NOT IN ('aprovacao','recusa')
    OR p_leu_condicoes IS DISTINCT FROM true
  THEN RETURN false; END IF;

  -- A ordem dos locks coincide com emissão e revogação: orçamento, depois link.
  SELECT a.orcamento_id INTO v_orcamento
  FROM gestao.links_aceite_cliente a WHERE a.token_hash=p_hash;
  IF v_orcamento IS NULL THEN RETURN false; END IF;

  SELECT o.lead_id,o.versao_atual,o.status,l.status,v.validade_em
    INTO v_lead,v_atual,v_status,v_lead_status,v_validade
  FROM gestao.orcamentos o
  JOIN gestao.leads l ON l.id=o.lead_id
  JOIN gestao.orcamento_versoes v
    ON v.orcamento_id=o.id AND v.versao=o.versao_atual
  WHERE o.id=v_orcamento FOR UPDATE OF o,l;

  SELECT * INTO v_link
  FROM gestao.links_aceite_cliente a
  WHERE a.token_hash=p_hash FOR UPDATE;
  v_agora := clock_timestamp();
  IF v_atual IS NULL OR v_link.id IS NULL
    OR v_link.versao<>v_atual OR v_link.revogado_em IS NOT NULL
    OR v_link.utilizado_em IS NOT NULL OR v_agora>=v_link.expira_em
    OR v_validade IS NULL OR v_agora>=v_validade
    OR v_status<>'enviado' OR v_lead_status<>'orcamento_enviado'
  THEN RETURN false; END IF;

  v_status_novo := CASE WHEN p_resposta='aprovacao' THEN 'aprovado' ELSE 'recusado' END;

  UPDATE gestao.links_aceite_cliente
  SET utilizado_em=v_agora,resposta=p_resposta WHERE id=v_link.id;
  UPDATE gestao.orcamentos SET status=v_status_novo WHERE id=v_orcamento;
  UPDATE gestao.leads SET status=v_status_novo WHERE id=v_lead;
  IF p_resposta='aprovacao' THEN
    UPDATE gestao.orcamento_versoes
    SET aprovado_em=v_agora,
        aprovado_por='Detentor do link privado (identidade não verificada)'
    WHERE orcamento_id=v_orcamento AND versao=v_atual;
  END IF;

  INSERT INTO gestao.auditoria(ator_id,entidade,entidade_id,acao,detalhes)
  VALUES (NULL,'orcamento',v_orcamento,'resposta_link_cliente',
    jsonb_build_object('versao',v_atual,'resposta',p_resposta,
      'link_id',v_link.id,'identidade_verificada',false));
  RETURN true;
END;
$$;

-- Uma alteração de contato invalida automaticamente a vinculação antiga.
-- O desafio não se torna válido novamente só porque o telefone/email foi corrigido.
CREATE FUNCTION gestao.revogar_vinculo_por_mudanca_016()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $
DECLARE v_agora timestamptz;
BEGIN
  IF NEW.telefone IS NOT DISTINCT FROM OLD.telefone
    AND NEW.email IS NOT DISTINCT FROM OLD.email
  THEN RETURN NEW; END IF;
  v_agora:=clock_timestamp();
  WITH revogados AS (
    UPDATE gestao.canais_vinculados_016 c
    SET revogado_em=v_agora
    WHERE c.cliente_id=NEW.id AND c.revogado_em IS NULL
      AND (
        (NEW.telefone IS DISTINCT FROM OLD.telefone
          AND c.tipo IN ('telefone','whatsapp'))
        OR (NEW.email IS DISTINCT FROM OLD.email AND c.tipo='email')
      )
    RETURNING c.id
  )
  UPDATE gestao.desafios_canal_016 d
  SET revogado_em=v_agora
  WHERE d.canal_id IN (SELECT id FROM revogados)
    AND d.utilizado_em IS NULL AND d.revogado_em IS NULL;
  RETURN NEW;
END;
$;
REVOKE ALL ON FUNCTION gestao.revogar_vinculo_por_mudanca_016() FROM PUBLIC;
CREATE TRIGGER trg_revogar_vinculo_por_mudanca_016
AFTER UPDATE OF telefone,email ON gestao.clientes
FOR EACH ROW EXECUTE FUNCTION gestao.revogar_vinculo_por_mudanca_016();

REVOKE ALL ON FUNCTION gestao.responder_link_aceite_cliente(text,text,boolean) FROM PUBLIC;

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_app') THEN
    GRANT EXECUTE ON FUNCTION gestao.emitir_desafio_canal_016(text,uuid,integer,uuid,text) TO gestao_app;
    GRANT EXECUTE ON FUNCTION gestao.responder_link_desafio_016(text,text,text,boolean) TO gestao_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='gestao_convites') THEN
    REVOKE ALL ON FUNCTION gestao.emitir_desafio_canal_016(text,uuid,integer,uuid,text) FROM gestao_convites;
    REVOKE ALL ON FUNCTION gestao.responder_link_desafio_016(text,text,text,boolean) FROM gestao_convites;
  END IF;
END
$grants$;
