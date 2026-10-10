# Acompanhamento Google Ads — Eletrotécnico GO

> Registro inicial: 08/10/2026. Fonte: capturas de tela fornecidas pelo responsável; os números são fotografia do período e não atualizam automaticamente.

## Estado atual e decisão de otimização — 09/10/2026, 23h12 (Brasília)

> **Fotografia do período 06–09/10/2026, a partir das capturas do Google Ads enviadas pelo responsável.** Não representa métricas em tempo real. A campanha elétrica foi **pausada voluntariamente pelo responsável** para melhorias; **não reativar sem solicitação**. Orçamento permanece configurado em **R$ 20/dia**, estratégia **Maximizar cliques**.

### Indicadores e evidências
- **244 impressões, 13 cliques, CTR 5,33%, gasto R$ 85,52, CPC médio R$ 6,58 e 0 conversões atribuídas no Google Ads**.
- **Dois contatos reais pelo WhatsApp em 09/10**, mas a origem individual (anúncio pago versus busca orgânica ou outros canais) **não foi confirmada**. Não usar 2 como conversões atribuídas nem calcular CPL atribuído com esse gasto.
- Relatório GA4 de 06–09/10: **16 sessões Paid Search**, 1 sessão engajada e **1 `whatsapp_click` em `google / cpc`**. O evento indica clique no link, **não mensagem enviada, lead qualificado nem conversão necessariamente atribuível no Google Ads**. Outras ocorrências `tagassistant.google.com / referral` são tráfego de depuração e devem ser separadas dos clientes reais.
- Google Ads ↔ GA4 vinculado desde 06/10; marcação automática ("Codificação automática") ativa. Ação **`Lead - WhatsApp`** principal, importada do GA4, com contagem **Uma** e janela de 90 dias. Outras ações visíveis: chamadas dos anúncios (principal) e `Conversation started` (principal, mas não incluída nas metas da conta). Nenhuma duplicidade ativa confirmada na tela de ações.
- Consent Mode v2 revisado na PR [#12](https://github.com/Tivytinz/servicos-eletrotecnicos/pull/12) e publicado; no Tag Assistant foram confirmados **estado inicial denied** para os quatro sinais e, após aceite explícito, `analytics_storage`, `ad_storage`, `ad_user_data` como **granted** com `ad_personalization=denied`. O hit `whatsapp_click` foi visto no GA4 e na tag Google Ads. Atribuição final no Ads ainda depende de tráfego pago real e processamento.

### Diagnóstico de palavras-chave e gasto

| Palavra | Tipo | Impr. | Cliques | Custo | Índice de qualidade |
| --- | --- | ---: | ---: | ---: | ---: |
| `eletricista goiania` | Ampla | 101 | 8 | R$ 47,81 | 3/10 |
| `eletricista goiânia` | Ampla | 14 | 2 | R$ 16,64 | 3/10 |
| `[eletricista goiania]` | Exata | 88 | 1 | R$ 5,89 | 3/10 |
| `"eletricista goiânia"` | Frase | 12 | 1 | R$ 6,56 | 3/10 |
| `"eletricista aparecida de goiania"` | Frase | 2 | 1 | R$ 8,62 | 1/10 |
| `eletricista em goiânia` | Ampla | 11 | 0 | R$ 0,00 | 2/10 |

- As duas amplas de Goiânia somaram **R$ 64,45**, aproximadamente **75,4%** do gasto (R$ 85,52). Amostra insuficiente para concluir que são cliques ruins ou que a campanha não é rentável.
- Nos termos principais de Goiânia, **relevância do anúncio acima da média**, mas **experiência da página de destino e CTR esperado abaixo da média**. Melhorias recentes da landing podem ainda não ter sido reavaliadas pelo Google.
- Variações de **Aparecida de Goiânia** têm índice **1/10**, relevância do anúncio, CTR esperado e experiência da página abaixo da média; algumas são raramente exibidas por baixo índice de qualidade.
- O relatório de termos individuais exibiu apenas **R$ 9,46** do gasto; **R$ 76,06** estavam agrupados em "outros termos" não disponibilizados individualmente. Não inferir que todos sejam irrelevantes. Insights também apresentou categoria "termos de pesquisa sem classificação".

### Plano proposto — ainda não executado no Google Ads

1. **Enquanto a campanha está pausada**, preparar auditoria das palavras de correspondência ampla e proposta de pausa **temporária** das duas variações amplas de Goiânia que mais consumiram verba, com preservação do histórico; conferir eventuais duplicações e sobreposições.
2. Priorizar palavras de **frase e exata** com intenção clara de contratar eletricista. Não negativar termos apenas por serem genéricos; avaliar consultas relevantes, evitando exclusões precipitadas com baixa amostra.
3. Preparar grupo de anúncios **Goiânia**, grupo **Aparecida de Goiânia** com títulos locais próprios e grupo temático de **instalação/adequação de padrão de energia** (serviço prestado), sem afirmar parceria ou credenciamento com a concessionária.
4. Avaliar equilíbrio entre segmentação e orçamento limitado de **R$ 20/dia**; evitar fragmentação excessiva, anúncios incoerentes e mudanças simultâneas que dificultem comparação.
5. Reavaliar **Índice de Qualidade**, relevância, CTR esperado e experiência da página após novo período de circulação. Não prometer melhoria automática da pontuação.
6. Medir **clique no WhatsApp**, conversa iniciada, orçamento e serviço fechado separadamente; acompanhar importação `Lead - WhatsApp` no Google Ads após novos cliques pagos genuínos.
7. **Não reativar a campanha nem aumentar orçamento/lances sem autorização do responsável.**

**Plano de reorganização preparado:** [grupos, 15 palavras-chave propostas e 2 anúncios responsivos completos para Goiânia e Aparecida](./plano-google-ads-goiania-aparecida-2026-10-09.md). Documento **pendente de aprovação/aplicação** na conta Google Ads. Não reativar sem solicitação.

---

## Campanha
- Nome: **Pesquisa | Serviços Elétricos | Goiânia**
- Situação histórica inicial: ativada, *Qualificada (aprendizado)*. **Situação atual em 09/10/2026: pausada voluntariamente para otimização.**
- Início: 06/10/2026
- Rede: Pesquisa do Google
- Orçamento: **R$ 20/dia**
- Estratégia de lances: **Maximizar cliques**
- Idioma: português
- Programação: todos os dias
- Dispositivos: todos
- Regiões: **Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo e Trindade (GO)**
- Opção de local: **Presença** (confirmada pelo usuário)
- Landing page: https://eletrotecnicogo.com.br/servicos-eletricos

## Baseline de desempenho (06–08/10/2026, conforme Google Ads)
| Métrica | Resultado |
| --- | ---: |
| Impressões | 88 |
| Cliques | 6 |
| CTR | 6,82% |
| Gasto | R$ 39,95 |
| CPC médio | R$ 6,66 |
| Conversões atribuídas | 0 |

### Palavras-chave observadas
| Palavra-chave | Correspondência | Impressões | Cliques | Custo |
| --- | --- | ---: | ---: | ---: |
| eletricista goiânia | Ampla | 11 | 2 | R$ 16,64 |
| eletricista goiania | Ampla | 8 | 2 | R$ 8,13 |
| "eletricista goiania" | Frase | 12 | 1 | R$ 6,56 |
| "eletricista aparecida de goiania" | Frase | 2 | 1 | R$ 8,62 |
| [eletricista goiania] | Exata | 48 | 0 | R$ 0,00 |

Demais variações de palavras-chave também estão ativas. As palavras mostradas pertencem ao **Grupo de anúncios 1**. Não interpretar seis cliques como amostra suficiente para decidir vencedores.

## Conversões e mensuração
- Ação do Google Ads: **Lead - WhatsApp**
- Origem: importação do **Google Analytics 4**, propriedade **Eletrotécnico GO**
- Evento do GA4: `whatsapp_click`
- Criada em: 06/10/2026
- Categoria: Contatos; ação **principal**
- Contagem: **Uma** na conferência mais recente em 09/10/2026 (inicialmente observada como **Todas** em 08/10).
- Janela de conversão por clique: 90 dias
- Modelo: atribuição baseada em dados
- Valor padrão quando ausente no GA4: R$ 1
- Status observado em 08/10: **Conversões pendentes**
- Teste com **Tag Assistant + GA4 DebugView**: `page_view`, `click` e `whatsapp_click` foram recebidos; `whatsapp_click` apareceu marcado como evento principal.
- **Limite do teste**: demonstra recebimento no GA4, mas **não comprova atribuição de conversões aos anúncios**, pois o teste foi feito sem clique pago.
- O evento mede **clique no WhatsApp**, não necessariamente conversa iniciada, lead qualificado ou venda.

## Plano de melhorias e acompanhamento
1. **Verificar termos de pesquisa** e propor negativas somente para consultas sem intenção de contratação; não bloquear preço/orçamento automaticamente.
2. **Avaliar correspondências amplas** e palavras repetidas por intenção antes de pausar; preservar suficientes dados e relevância.
3. **Revisar a contagem da ação de lead** (em geral `Uma` por interação com anúncio) e validar vínculo/importação GA4 → Google Ads, consentimento e atribuição.
4. **Manter R$20/dia e Maximizar cliques inicialmente**; reavaliar após sinais de conversão e CPC por termo.
5. **Analisar anúncios, recursos, horários e relatórios por localização** conforme dados acumularem.
6. **Considerar grupos temáticos** para eletricista geral, padrão de energia, manutenção, emergência etc., apenas para serviços efetivamente oferecidos, evitando fragmentar orçamento cedo demais.
7. Atualizar periodicamente este arquivo com datas, impressões, cliques, gasto, CPC, contatos reais, conversões atribuídas, custo por lead e alterações feitas.

## Auditoria de qualidade e baseline anterior ao novo deploy — 09/10/2026

> Fonte: capturas de tela do Google Ads em 09/10/2026, período selecionado **06–09/10/2026**. Esta é a referência pré-melhoria da landing, **não um relatório em tempo real**.

| Indicador | Referência |
| --- | ---: |
| Impressões | 244 |
| Cliques | 13 |
| CTR | 5,33% |
| CPC médio | R$ 6,58 |
| Gasto | R$ 85,52 |
| Conversões atribuídas no Google Ads | 0 |
| Orçamento diário | R$ 20 |
| Lance | Maximizar cliques |

### Palavras-chave e diagnóstico de qualidade

- `eletricista goiania` (ampla): **101 impressões, 8 cliques, R$ 47,81, índice 3/10**; relevância do anúncio acima da média, experiência da página e CTR esperado abaixo da média.
- `eletricista goiânia` (ampla): **14 impressões, 2 cliques, R$ 16,64, índice 3/10**; mesmo diagnóstico dos componentes.
- `[eletricista goiania]` (exata): **88 impressões, 1 clique, R$ 5,89, índice 3/10**.
- `"eletricista goiania"` (frase): **12 impressões, 1 clique, R$ 6,56, índice 3/10**.
- `"eletricista aparecida de goiania"` (frase): **2 impressões, 1 clique, R$ 8,62, índice 1/10**; relevância, experiência da página e CTR esperado abaixo da média.
- `eletricista em goiânia` (ampla): **11 impressões, nenhum clique, índice 2/10**.
- Variações de Aparecida com **índice 1/10**, algumas *raramente mostradas* por baixo índice de qualidade.

As duas primeiras palavras amplas concentraram **R$ 64,45 de R$ 85,52 (~75%)** no período; o volume é insuficiente para julgar rentabilidade. O Índice de Qualidade é indicador de diagnóstico, não prova de melhora comercial.

### Correção da landing publicada em 09/10/2026

- PR [#7](https://github.com/Tivytinz/servicos-eletrotecnicos/pull/7), merge na `main` commit `607a0b54dfc264a04f4bec5e684aca1be04d1fe1`.
- Novo H1 e metadados focados em **eletricista em Goiânia e Aparecida de Goiânia**.
- Bloco específico para **instalação e adequação de padrão de energia**; melhoria de serviços, localidades, FAQ e contato telefônico.
- URLs existentes e canonical `/servicos-eletricos` preservadas; quatro CTAs para WhatsApp preservados.
- Workflow de lint e build adicionado em `.github/workflows/check.yml` e executado com sucesso na PR.
- Railway: deploy `3dc0cfaa-da5d-41a4-9660-e663fac5f95a`, **SUCCESS**, serviço online e sem alertas na verificação posterior.
- Revisão do código confirmou que o handler captura cliques em links `wa.me` ou `api.whatsapp.com` e transmite `whatsapp_click` ao GA4 **somente após consentimento**. A variável de configuração do GA4 está declarada no Railway.
- **Limitações**: não foi possível realizar uma navegação externa visual automatizada ou confirmar cliques/conversões no GA4 *após* o deploy. Os testes de DebugView anteriores comprovam recebimento naquela versão, não necessariamente eventos desta publicação.
- **Google Ads inalterado**: orçamento de R$ 20/dia e estratégia de Maximizar cliques continuam; a campanha solar permanece independente com R$ 20/dia.

### Plano de acompanhamento de 12 a 16/10/2026

1. Capturar nova tela de **Palavras-chave** com índice de qualidade, relevância do anúncio, experiência da página e CTR esperado. Comparar somente palavras-chave equivalentes e após nova avaliação do Google.
2. Conferir **Termos de pesquisa**, CPC, cliques, gasto e negativas por relevância, evitando pausas em massa com baixa amostra.
3. Verificar `whatsapp_click` em **GA4 → Tempo real/DebugView** após aceite de consentimento; confirmar que `Lead - WhatsApp` no Google Ads esteja apta a importar eventos de tráfego pago.
4. Registrar **conversas iniciadas, contatos válidos, orçamentos e serviços fechados** separadamente; clique no WhatsApp não é lead confirmado.
5. Inspecionar **mobile** (H1, botões, seções e FAQ) e desempenho da URL no PageSpeed Insights. Registrar achados antes de novas mudanças.
6. Não concluir causalidade de mudanças no Índice de Qualidade ou custo por lead com amostra pequena; considerar sazonalidade, atrasos de atualização e outros fatores.

## Histórico de intervenções
| Data | Ação | Resultado |
| --- | --- | --- |
| 08/10/2026 | Auditoria inicial, região e GA4 DebugView | Cinco cidades confirmadas; evento `whatsapp_click` registrado em depuração; conversões Google Ads ainda pendentes |
| 08/10/2026 | Registro de baseline e próximos passos | Documentação, **sem alterações na configuração da campanha** |
| 09/10/2026 | Landing elétrica revisada, CI implantado e PR #7 integrada | Railway confirmou deploy online; sem alteração de orçamento/lances; conversões pós-deploy ainda não verificadas |
| 09/10/2026 | Revisão GA4/Google Ads/Consent Mode v2 e captura completa das palavras-chave | Tag Assistant confirmou sinais e `whatsapp_click`; anotada a campanha pausada, baseline e proposta de estrutura sem alterar anúncios ou lances |

> Privacidade: evitar salvar IDs de contas publicitárias, dados pessoais de clientes ou tokens neste arquivo.
