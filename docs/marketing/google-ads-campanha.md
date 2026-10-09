# Acompanhamento Google Ads — Eletrotécnico GO

> Registro inicial: 08/10/2026. Fonte: capturas de tela fornecidas pelo responsável; os números são fotografia do período e não atualizam automaticamente.

## Campanha
- Nome: **Pesquisa | Serviços Elétricos | Goiânia**
- Situação: ativada, *Qualificada (aprendizado)*
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
- Contagem: **Todas** (configuração observada; avaliar troca para **Uma** para geração de leads)
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

> Privacidade: evitar salvar IDs de contas publicitárias, dados pessoais de clientes ou tokens neste arquivo.
