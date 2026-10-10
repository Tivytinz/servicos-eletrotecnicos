# D1 — Inventário inicial e diagnóstico da campanha elétrica

> Status: **parcial, em andamento** · 09/10/2026 · Fonte: capturas manuais do Google Ads de 06–09/10 e documentos do repositório. Não se trata de acesso à conta ao vivo. 
> Campanha **Pesquisa | Serviços Elétricos | Goiânia** continua **pausada** por escolha do responsável. **Nenhuma configuração no Google Ads foi alterada por esta auditoria.**

## Baseline verificado

| Métrica | Baseline 06–09/10/2026 |
| --- | ---: |
| Impressões | 244 |
| Cliques | 13 |
| CTR | 5,33% |
| Custo | R$ 85,52 |
| CPC médio | R$ 6,58 |
| Conversões atribuídas no Google Ads | 0 |
| Orçamento configurado | R$ 20/dia |
| Estratégia de lances | Maximizar cliques |
| Situação quando capturado | Pausada (decisão deliberada) |

## Palavras-chave individualmente visíveis nas capturas

**Atenção:** 10 linhas **visíveis**, não a lista integral. O histórico indica **27 palavras-chave** anteriormente cadastradas, a conferir no Google Ads. Os grupos e as demais palavras não podem ser tratados como revisados até exportar o relatório completo.

| Palavra visível | Correspondência | Impressões | Cliques | Custo | Índice | Intenção | Proposta de tratamento (não aplicada) |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `eletricista goiania` | Ampla | 101 | 8 | R$ 47,81 | 3/10 | Goiânia | Propor pausa temporária somente na implantação aprovada |
| `[eletricista goiania]` | Exata | 88 | 1 | R$ 5,89 | 3/10 | Goiânia | Manter/reaproveitar no Grupo 01; não criar cópia |
| `eletricista goiânia` | Ampla | 14 | 2 | R$ 16,64 | 3/10 | Goiânia | Propor pausa temporária somente na implantação aprovada |
| `"eletricista goiânia"` | Frase | 12 | 1 | R$ 6,56 | 3/10 | Goiânia | Manter/reaproveitar; não criar variante quase idêntica |
| `eletricista em goiânia` | Ampla | 11 | 0 | R$ 0,00 | 2/10 | Goiânia | Revisar após exportação integral; não confundir com correspondência de frase |
| `"eletrotécnico goiania"` | Frase | 6 | 0 | R$ 0,00 | — | Marca | Verificar variante real no CSV (transcrição visual); manter/categorizar como marca após conferir |
| `eletricista aparecida de goiânia` | Ampla | 3 | 0 | R$ 0,00 | 1/10 | Aparecida | Verificar sobreposição; proposta de pausa temporária após criar Grupo 02 |
| `eletricista em aparecida de goiânia` | Ampla | 3 | 0 | R$ 0,00 | 1/10 | Aparecida | Revisar ao implantar Grupo 02 |
| `"eletricista aparecida de goiania"` | Frase | 2 | 1 | R$ 8,62 | 1/10 | Aparecida | Criar equivalente no Grupo 02 e pausar original para preservar histórico |
| `eletricista perto de mim` | Ampla | 2 | 0 | R$ 0,00 | 3/10 | Genérica/local | Avaliar cobertura de outras cidades antes de pausar |

As 10 linhas acima somam **13 cliques e R$ 85,52** nos registros de palavras-chave; conferir o conjunto integral antes de reconciliar com os totais da campanha. Em particular, os primeiros cinco itens do grupo original não provam exclusividade de nenhuma busca, pois termos individuais podem ter sido ocultados.

Duas amplas de Goiânia (`eletricista goiania` e `eletricista goiânia`) = **10 de 13 cliques, R$ 64,45 dos R$ 85,52 de gasto (~75,4%)**. Isso justifica **teste de pausa temporária**, não conclusão de desperdício; a amostra é de apenas 13 cliques e as conversões atribuídas ainda não estão disponíveis.

## Estrutura / conta — evidências prévias

- Campanha: somente Pesquisa Google; idioma português; orçamento R$20/dia; lances Maximizar cliques.
- Localidades documentadas: Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo, Trindade; opção de localização **Presença**. Precisa confirmar se não houve edição posterior.
- No último registro, as 10 palavras mostradas pertenciam ao **Grupo de anúncios 1**, com anúncio responsivo abrangendo Goiânia e região; o inventário integral dos anúncios ainda depende da exportação.
- Página de destino em uso: `https://eletrotecnicogo.com.br/servicos-eletricos`. O H1 já menciona Goiânia e Aparecida e a landing oferece instalações, manutenção, quadros, tomadas, iluminação e padrão de energia.
- Ação principal Google Ads: `Lead - WhatsApp` via GA4, evento `whatsapp_click`; contagem `Uma`, janela 90 dias. Dois contatos reais recebidos em 09/10 não têm atribuição individual comprovada.
- Consent Mode v2 e envio `whatsapp_click` foram validados via Tag Assistant; **não equivalem** a atribuição de venda/campanha. Não modificar conversões nesta sprint.
- Lista histórica de negativas por intenção: apostila, aprender, atacado, como fazer, comprar, curso, cursos, emprego, empregos, faça você mesmo, grátis, gratuito, loja, material elétrico, pdf, salário, salários, tutorial, vaga, vagas. **Confirmar escopo e estado atual na conta**.

## Decisões D1: documentadas, ainda não implementadas

| Decisão | Recomendação | Justificativa |
| --- | --- | --- |
| `eletricista goiania` ampla | **Propor pausa temporária** | 8 cliques/R$47,81; baixa amostra e sobreposição com exata/frase |
| `eletricista goiânia` ampla | **Propor pausa temporária** | 2 cliques/R$16,64; intenção coincidente |
| `[eletricista goiania]` exata e `"eletricista goiânia"` frase | **Manter no Grupo 01** | Correspondências de maior controle; preservar histórico |
| Aparecida: 2 amplas + 1 frase identificadas | **Separar por intenção no Grupo 02**, com migração cuidadosamente sequenciada | Índice 1/10; anúncio genérico não fala claramente da cidade |
| `eletricista perto de mim` ampla | **Avaliar, não pausar automaticamente** | Pode captar procura local nas cinco cidades cobertas |
| Palavra de marca | **Confirmar texto e intenção no CSV antes de decidir** | Apenas transcrição de captura, sem volume |
| Demais palavras e negativas | **Não alterar sem inventário integral** | Parte relevante não aparece nas capturas disponíveis |

## O que falta para encerrar a issue #15

1. **Exportar no Google Ads** o relatório completo de palavras-chave (preferencialmente CSV; todas as linhas, com ativas e pausadas) com: palavra, tipo de correspondência, grupo de anúncios, status, impressões, cliques, custo, Índice de Qualidade, relevância, experiência na landing e CTR esperado. Conferir a quantidade efetiva, estimada anteriormente em 27.
2. **Exportar anúncios e negativas** da mesma campanha (idealmente CSV) ou capturas de todas as linhas, identificando grupos e URLs. Conferir que não há filtros de status ocultando palavras relevantes.
3. Comparar exportação real com a proposta em `plano-google-ads-goiania-aparecida-2026-10-09.md`, atribuindo manter / reaproveitar / pausar / criar e identificando duplicatas (incluindo acentos).
4. Validar se existem mudanças recentes em localizações, metas, palavras e anúncios desde as capturas. Sem acesso direto à conta, **essa etapa depende dos relatórios fornecidos pelo responsável ou de conector Google Ads autenticado**.
5. Após revisar o inventário, marcar os itens da issue #15; **não encerrá-la** com apenas as 10 linhas visíveis.

## Regra operacional

Não reativar, não editar orçamento, não habilitar anúncio e não apagar keywords; campanha solar permanece intocada. A proposta de dois grupos está na PR #14 e depende de aprovação e conferência integral antes de execução.
