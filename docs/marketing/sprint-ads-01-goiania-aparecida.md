# Sprint Ads 01 — Reorganização Goiânia e Aparecida

**Produto:** Eletrotécnico GO · **Área:** Google Ads — Pesquisa · **Estado:** planejamento (backlog criado, sem implantação no Google Ads)  
**Timebox:** cinco dias úteis após aprovação do backlog; não confundir com cinco dias corridos.  
**Capacidade estimada:** 15 pontos. Pontos são estimativa relativa de esforço, **não horas faturáveis**.  
**Campanha:** `Pesquisa | Serviços Elétricos | Goiânia`. Continua **pausada**.  
**Responsáveis sugeridos:** operação Google Ads (execução das configurações) e responsável da Eletrotécnico GO (validação e decisão final). A designação nominal fica pendente.

## Sprint Goal

Preparar e validar a reorganização de **dois grupos de anúncios** com mensagens específicas para **Goiânia** e **Aparecida de Goiânia**, ampliando controle de correspondência e preservando a atribuição do clique no WhatsApp, **sem aumentar o orçamento nem reativar a campanha automaticamente**.

**Resultado esperado:** estrutura pronta, revisada e aprovada para um teste controlado após autorização; melhor qualidade de leads e rentabilidade são **hipóteses** a testar após publicação, não condições garantidas da sprint.

## Product Backlog comprometido

| Dia útil | Issue | Entrega | Pontos | Critério objetivo |
| --- | --- | --- | ---: | --- |
| D1 | [#15 — Inventário e baseline](https://github.com/Tivytinz/servicos-eletrotecnicos/issues/15) | Backup e classificação de palavras, anúncios, negativas, geografia e metas | 2 | Inventário e plano de manter/pausar/criar registrados |
| D2 | [#16 — Grupo Goiânia](https://github.com/Tivytinz/servicos-eletrotecnicos/issues/16) | Grupo `01 - Eletricista Goiânia` e RSA local | 3 | Correspondências e peças revisadas, sem duplicatas |
| D3 | [#17 — Grupo Aparecida](https://github.com/Tivytinz/servicos-eletrotecnicos/issues/17) | Grupo `02 - Eletricista Aparecida` e RSA local | 3 | Textos/keywords específicos, sem perder histórico |
| D4 | [#18 — Amplas e negativas](https://github.com/Tivytinz/servicos-eletrotecnicos/issues/18) | Decisão reversível sobre duas amplas de alto custo e sobreposições | 3 | Alterações justificadas e impactos nas cinco cidades verificados |
| D5 | [#19 — QA e go/no-go](https://github.com/Tivytinz/servicos-eletrotecnicos/issues/19) | Checklist funcional, mensuração e aprovação de reativação | 4 | QA concluído e decisão documentada; **não reativar sem autorização** |
| | **Total** | | **15** | |

### Materiais de referência

- [PR #14 — Proposta detalhada de dois grupos, 15 keywords e dois RSAs](https://github.com/Tivytinz/servicos-eletrotecnicos/pull/14).
- [Documento de anúncios e palavras-chave](./plano-google-ads-goiania-aparecida-2026-10-09.md).
- [Histórico e baseline da campanha](./google-ads-campanha.md).

## Rotina de execução

**D1 — Planejar / auditar:** coletar estado atual da conta antes de tocar em anúncios e comparar com o último snapshot.  
**D2–D3 — Montar e revisar:** seguir o plano dos dois grupos; os anúncios serão inseridos na conta **apenas com autorização operacional**.  
**D4 — Higienizar:** priorizar a pausa **temporária**, não exclusão, das palavras amplas de Goiânia que tiveram alto gasto; conferir negativas existentes e cobertura dos demais municípios.  
**D5 — Validar e decidir:** revisão cruzada, links, mensuração, verificações da campanha e aprovação expressa antes da reativação.

**Check-in diário:** registrar (i) itens concluídos, (ii) bloqueios, (iii) decisões pendentes, (iv) alterações efetivamente aplicadas ao Google Ads versus apenas planejadas. Marcar checkbox dos Issues somente após executar a etapa.

## Definition of Ready (DoR)

- [x] Objetivo de negócio declarado: mais contatos qualificados e serviços fechados com custo controlado.
- [x] Baseline histórico conhecido: 244 impressões, 13 cliques, gasto R$85,52, 0 conversões atribuídas (06–09/10/2026).
- [x] Campanha pausada e orçamento de R$20/dia identificado.
- [x] Rascunhos de 2 RSAs (15 títulos + 4 descrições cada) e 15 palavras candidatas na PR #14.
- [ ] Lista exata e atualizada de palavras, anúncios e negativas revisada **na própria conta Google Ads**.
- [ ] Responsável pela execução e janela de implantação aprovados.

## Definition of Done (DoD)

- [ ] Os dois grupos estão definidos/implementados conforme aprovação e nomeados de forma inequívoca.
- [ ] Anúncios conferidos dentro dos limites de 30 caracteres/título e 90/descrição, sem alegações não verificadas.
- [ ] Keywords de frase/exata revistas para evitar equivalências duplicadas; histórico anterior preservado.
- [ ] Decisão sobre as duas palavras amplas de maior gasto documentada e reversível.
- [ ] URL de destino `/servicos-eletricos`, CTAs WhatsApp e consentimentos verificados.
- [ ] Grupo de Aparecida não é tratado incorretamente como segmentação geográfica independente.
- [ ] Campanha solar permanece intocada; orçamento R$20/dia e Maximizar cliques inalterados.
- [ ] Campanha elétrica permanece pausada **até liberação explícita**; conclusão da sprint não autoriza veiculação.
- [ ] Relatório curto de encerramento: o que foi aplicado, o que ficou pendente, riscos e decisão go/no-go.

## Métricas e teste de resultado — após a sprint

**Pré-reativação:** sem novos resultados de veiculação enquanto a campanha está pausada; não esperar variação de CPC, Índice de Qualidade ou conversões durante esta sprint.

**Sprint Ads 02 — acompanhamento pós-reativação:** janela inicial sugerida de 7–14 dias, **somente depois de autorização explícita**. Monitorar por grupo:
- buscas reais, impressões, cliques, CTR, CPC e gasto;
- `whatsapp_click` no GA4 e conversões atribuídas no Ads, separando testes do Tag Assistant;
- **conversas reais**, pedidos de orçamento, orçamentos enviados, serviços fechados, receita e margem;
- custo por conversa válida e por serviço fechado, quando houver amostra suficiente.

**Critério comercial:** comparar qualidade dos contatos e rentabilidade, não apenas quantidade de cliques. Nenhuma melhoria está garantida; a amostra atual de 13 cliques é pequena.

## Fora de escopo

- Reativação sem aprovação; aumento de orçamento ou mudança de lance.
- Criação de campanha separada por município (geografia permanece no nível de campanha).
- Campanha solar e expansão imediata para grupo separado de padrão de energia.
- Nova landing em Aparecida antes de evidência de necessidade.
- Exclusão definitiva de keywords e configuração de conversão duplicada.
