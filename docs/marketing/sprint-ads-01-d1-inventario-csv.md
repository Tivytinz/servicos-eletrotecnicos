# Inventário integral de palavras-chave — Dia 1 / Sprint Ads 01

> **Arquivo-fonte:** CSV `Relatório de palavras-chave da rede de pesquisa (3).csv` enviado pelo responsável, exportação **06–09/10/2026** do Google Ads em 09/10/2026. UTF-16, separado por TAB. **O arquivo contém 27 linhas individuais de keywords** + totais. Os dados são um snapshot histórico, não leitura ao vivo.
>
> **IMPORTANTE:** Todas as 27 palavras-chave constam com status individual **Ativado**, mas com situação **Não qualificado** porque a **campanha está pausada**. **Não foram feitas mudanças no Google Ads.**

## Reconciliação validada com o relatório

| Métrica | Resultado |
| --- | ---: |
| Quantidade total de palavras-chave individuais | **27** |
| Correspondência ampla | **10** |
| Correspondência de frase | **15** |
| Correspondência exata | **2** |
| Grupos de anúncios identificados | **1** (`Grupo de anúncios 1`) |
| Impressões | **244** |
| Cliques | **13** |
| Gasto | **R$ 85,52** |
| Conversões atribuídas no Google Ads | **0** |
| Keywords de Goiânia (incluindo termos de serviço e marca) | **19** |
| Keywords de Aparecida de Goiânia | **6** |
| Keywords genéricas "perto de mim" | **2** |

| Tipo de correspondência | Palavras | Impressões | Cliques | Custo |
| --- | ---: | ---: | ---: | ---: |
| Ampla | 10 | 135 | 10 | R$ 64,45 |
| Frase | 15 | 20 | 2 | R$ 15,18 |
| Exata | 2 | 89 | 1 | R$ 5,89 |
| **Total** | **27** | **244** | **13** | **R$ 85,52** |

**Qualificação informada pelo Google Ads:** 12 keywords com motivo somente `campanha pausada`, 9 com `raramente exibido; campanha pausada` e 6 com `baixa qualidade; campanha pausada`. Nenhuma delas deve ser tratada como individualmente pausada.

## Análise integral — cada palavra e ação recomendada, *não aplicada*

| # | Palavra-chave | Tipo | Imp. | Cliques | Gasto | IQ | Intenção | Decisão proposta |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | `"eletrotécnico goiania"` | Frase | 6 | 0 | R$ 0,00 | — | Goiânia | Manter (termo de marca); conferir grafia com marca |
| 2 | `[eletricista goiania]` | Exata | 88 | 1 | R$ 5,89 | 3 | Goiânia | Manter no Grupo 01 existente; preservar histórico |
| 3 | `eletricista goiania` | Ampla | 101 | 8 | R$ 47,81 | 3 | Goiânia | Pausar temporariamente após revisão/aprovação |
| 4 | `eletricista goiânia` | Ampla | 14 | 2 | R$ 16,64 | 3 | Goiânia | Pausar temporariamente após revisão/aprovação (equiv. com/sem acento) |
| 5 | `"eletricista residencial goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter no Grupo 01; nenhuma despesa |
| 6 | `eletricista aparecida de goiania` | Ampla | 0 | 0 | R$ 0,00 | 1 | Aparecida | Propor pausa e substituir por termos de frase/exata no Grupo 02 |
| 7 | `"eletricista goiania"` | Frase | 12 | 1 | R$ 6,56 | 3 | Goiânia | Manter no Grupo 01; não criar variante redundante |
| 8 | `"inspeção elétrica goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter se serviço é oferecido; baixa busca |
| 9 | `"quadro elétrico goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter se serviço é oferecido; baixa busca |
| 10 | `eletricista residencial goiania` | Ampla | 0 | 0 | R$ 0,00 | — | Goiânia | Revisar pausa se mantida versão de frase |
| 11 | `"troca de disjuntor goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter se serviço é oferecido; baixa busca |
| 12 | `"serviços elétricos goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter; baixa busca |
| 13 | `eletricista em goiânia` | Ampla | 11 | 0 | R$ 0,00 | 2 | Goiânia | Propor pausa por redundância e baixo IQ |
| 14 | `eletricista aparecida de goiânia` | Ampla | 3 | 0 | R$ 0,00 | 1 | Aparecida | Propor pausa; variante de item 6 |
| 15 | `"eletricista aparecida de goiania"` | Frase | 2 | 1 | R$ 8,62 | 1 | Aparecida | Recriar no Grupo 02, depois pausar original sem excluir |
| 16 | `eletricista em goiania` | Ampla | 1 | 0 | R$ 0,00 | 3 | Goiânia | Propor pausa; variante de item 13 |
| 17 | `"instalação elétrica goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter; revisar com variante plural |
| 18 | `"aterramento elétrico goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter se serviço é oferecido; baixa busca |
| 19 | `eletricista perto de mim` | Ampla | 2 | 0 | R$ 0,00 | 3 | Genérica | Revisar cobertura de 5 cidades; evitar pausa automática |
| 20 | `"reparo elétrico goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter se serviço é oferecido; baixa busca |
| 21 | `"instalações elétricas goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Revisar sobreposição semântica com instalação no singular |
| 22 | `eletricista em aparecida de goiânia` | Ampla | 3 | 0 | R$ 0,00 | 1 | Aparecida | Propor pausa; variante de item 24 |
| 23 | `[eletricista aparecida de goiania]` | Exata | 1 | 0 | R$ 0,00 | 1 | Aparecida | Recriar no Grupo 02, depois pausar original sem excluir |
| 24 | `eletricista em aparecida de goiania` | Ampla | 0 | 0 | R$ 0,00 | — | Aparecida | Propor pausa; variante de item 22 |
| 25 | `"eletricista perto de mim"` | Frase | 0 | 0 | R$ 0,00 | 3 | Genérica | Manter em Goiânia temporariamente; busca local ampla |
| 26 | `"manutenção elétrica goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter no Grupo 01; baixa busca |
| 27 | `"eletricista comercial goiania"` | Frase | 0 | 0 | R$ 0,00 | — | Goiânia | Manter no Grupo 01; baixa busca |

## Redundâncias identificadas (comparação de intenção e acentuação)

**Quatro pares de correspondência ampla com grafias equivalentes:**
1. `eletricista goiania` / `eletricista goiânia` — **R$ 64,45** nos dois, 10 cliques.
2. `eletricista em goiania` / `eletricista em goiânia` — 12 impressões, zero cliques.
3. `eletricista aparecida de goiania` / `eletricista aparecida de goiânia` — 3 impressões, zero cliques.
4. `eletricista em aparecida de goiania` / `eletricista em aparecida de goiânia` — 3 impressões, zero cliques.

O Google pode reconhecer variantes próximas; esses pares são **redundâncias operacionais**, não prova de problemas na exibição ou de cobrança duplicada pelo mesmo clique.

Há também **dois formatos de correspondência da mesma busca-intenção**: `[eletricista goiania]` (exata) e `"eletricista goiania"` (frase); isso pode ser proposital e **não deve ser removido apenas por parecer repetido**. Idem para Aparecida.

Termos de `instalação elétrica` versus `instalações elétricas` em frase podem se sobrepor semanticamente e tiveram zero gasto. Rever após teste, sem exclusões prematuras.

## Implicações para PR #14 — revisar antes de copiar keywords

- **Grupo 01 — Goiânia:** aproveitar o **grupo existente**, mantendo `[eletricista goiania]`, `"eletricista goiania"`, `"eletricista residencial goiania"`, `"manutenção elétrica goiania"`, `"eletricista comercial goiania"`, `"serviços elétricos goiania"`, `"reparo elétrico goiania"`, `"instalação elétrica goiania"` e outras palavras de serviço já presentes. **A maioria das palavras propostas no rascunho já existe; não criar cópias.**
- **Grupo 02 — Aparecida:** `[eletricista aparecida de goiania]` (**já existe** no grupo original) e `"eletricista aparecida de goiania"` (**já existe**) precisam ser **recriadas no grupo novo** se aprovada a reestruturação. Depois de verificar elegibilidade, **pausar as originais** em vez de excluir, preservando relatórios históricos. **Não duplicar em dois grupos ativos.**
- **Ampliação do grupo 02:** priorizar inicialmente as duas palavras locais acima; as sugestões adicionais de manutenção/instalação em Aparecida são candidatas a testes, não copiar todas de uma vez com orçamento tão pequeno e histórico 1/10.
- **Amplas:** o plano de pausa temporária das **duas amplas pagas** de Goiânia é prioritário por concentração de gasto. Outras amplas redundantes são candidatas a pausa depois de conferir cobertura e consulta real. A ampla `eletricista perto de mim` deve ser examinada com atenção, pois pode alcançar cidades além de Goiânia/Aparecida.
- **Negativas:** não foram fornecidas no CSV, porque o arquivo é somente de keywords de pesquisa. Não se pode atestar a configuração atual da lista de negativas.
- **Anúncios e assets:** não constam neste CSV. É necessário ver anúncios responsivos/recursos antes de implantar os dois RSAs do planejamento.
- **Geografia:** as cinco cidades da campanha permanecem **configuração histórica**; confirmar presencialmente na conta na etapa final.

## Sequência segura de execução (dependente de aprovação)

1. Obter CSV/prints de **Anúncios** e **Palavras-chave negativas** da campanha; validar URLs, textos, ativos, escopo e localização.
2. Congelar inventário aprovado (manter, migrar, pausar, criar) antes de mudar a conta.
3. Renomear Grupo 1 para **01 - Eletricista Goiânia**, preservando histórico; atualizar RSA para Goiânia.
4. Criar **02 - Eletricista Aparecida** com RSA e termos locais de **frase/exata**; pausar as palavras de Aparecida no Grupo 01 apenas depois de confirmar que o Grupo 02 está configurado.
5. Aplicar pausas temporárias de amplas conforme aprovação; registrar antes/depois para teste controlado.
6. Validar tracking, URLs, negativas e anúncios; manter **campanha pausada, R$ 20/dia, Maximizar cliques** até ordem explícita de retomada.

## Status da issue #15

**Palavras-chave: inventário completo (27/27) e baseline reconciliado.**  
**Pendente:** verificação atual de **anúncios, assets, negativas e localização**. A issue deve continuar **aberta** até concluir esses itens. Mesmo um inventário 100% documentado não autoriza a reativação nem alteração da campanha.
