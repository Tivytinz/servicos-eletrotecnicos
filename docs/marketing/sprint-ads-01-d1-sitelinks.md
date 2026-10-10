# Sprint Ads 01 — Auditoria de recursos associados (Sitelinks)

> **Evidência:** CSV `Relatório de associação de recursos (1).csv`, período **06–09/10/2026**, exportado pelo responsável e recebido em 10/10/2026. Documento baseado na exportação, **não** em acesso ao Google Ads ao vivo.
>
> **Escopo:** campanha **⚡ Pesquisa | Serviços Elétricos | Goiânia**. Nenhuma configuração na conta foi modificada. A campanha está **pausada** voluntariamente, orçamento **R$ 20/dia**, lances **Maximizar cliques**.

## Achados confirmados no CSV

- **4 associações de recursos**, todas com `Status do recurso=Ativado`, `Nível=Campanha`, `Status=Qualificado`, `Adicionada por=Anunciante`; sem associação a grupo individual (`--`).
- As quatro entradas têm texto de sitelink, **duas linhas descritivas** e URL de destino. A estrutura é compatível com quatro sitelinks.
- **Três** sitelinks apontam para âncoras existentes na landing de serviços elétricos, verificadas no código Next.js em `src/app/servicos-eletricos/page.tsx`.
- **Um sitelink** (`Limpeza de Placas`) aponta para **landing de limpeza solar**, embora esteja associado à campanha de **serviços elétricos**; a Eletrotécnico GO possui **campanha solar separada**. Recomendar revisão/retirada dessa associação **somente após aprovação do responsável**.
- O anúncio responsivo existente tinha recomendação de adicionar **mais dois sitelinks**. Isso é uma recomendação de recursos, não prova de que existiam menos de quatro recursos. O CSV confirma **quatro**.
- **Não há conversões atribuídas** a nenhuma das quatro associações no recorte.

### Inventário detalhado

| Sitelink | Descrição 1 | Descrição 2 | URL atual | Imp. exibidas no relatório | Cliques exibidos | Custo exibido | Ação proposta |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| Manutenção Elétrica | Correção de falhas elétricas | Atendimento em Goiânia | [URL](https://eletrotecnicogo.com.br/servicos-eletricos#manutencao) | 102 | 9 | R$ 59,67 | Manter |
| Limpeza de Placas | Limpeza de módulos solares | Veja resultados reais | [URL](https://eletrotecnicogo.com.br/limpeza-de-placas-solares) | 88 | 6 | R$ 41,53 | Revisar/retirar associação da campanha elétrica, após aprovação |
| Instalações Elétricas | Instalações residenciais | Peça orçamento no WhatsApp | [URL](https://eletrotecnicogo.com.br/servicos-eletricos#instalacao-predial) | 114 | 11 | R$ 69,53 | Manter |
| Inspeção Elétrica | Avaliação da instalação | Identifique pontos de atenção | [URL](https://eletrotecnicogo.com.br/servicos-eletricos#inspecao) | 109 | 2 | R$ 13,80 | Manter |

### Interpretação **obrigatória** das métricas

No relatório de associação, as contagens por recurso **se sobrepõem**, porque múltiplos sitelinks podem estar associados e exibidos com um mesmo anúncio. No recorte:
- Somando **indevidamente** linhas: **28 cliques e R$ 184,53**.
- Total **real da campanha** (conferido nos CSVs de anúncios e keywords): **13 cliques e R$ 85,52**.
- Consequentemente, **não interpretar a linha `Limpeza de Placas` como seis cliques necessariamente feitos nesse sitelink ou R$ 41,53 desviados exclusivamente para a landing solar**. Esses números são métricas da associação e não estabelecem distribuição de cliques por destino.
- Para aferir cliques *específicos nos sitelinks*, usar relatórios segmentados por tipo de clique / interação com recurso e/ou dados de destino, quando disponíveis.

## Diagnóstico e proposta de reorganização

**Manter:** `Manutenção Elétrica`, `Instalações Elétricas` e `Inspeção Elétrica`, pois apoiam serviços reais, levam para a landing elétrica, e as âncoras `#manutencao`, `#instalacao-predial`, `#inspecao` existem no código.

**Revisar:** `Limpeza de Placas`, com destino à landing solar. Há duas campanhas temáticas separadas; misturar o produto pode reduzir a coerência entre intenção da pesquisa e página final. A retirada deve ser **somente da associação na campanha elétrica**, conferindo primeiro se o recurso é reutilizado em outra campanha/conta, **sem excluir um recurso compartilhado** e sem alterar a campanha solar.

**Adicionar depois de aprovação (três novos sitelinks de serviços elétricos):**

| Texto (até 25 caracteres) | Linha 1 (até 35) | Linha 2 (até 35) | URL final | Ancoragem verificada |
| --- | --- | --- | --- | --- |
| Padrão de Energia | Instalação e adequação | Avalie seu padrão de entrada | [URL](https://eletrotecnicogo.com.br/servicos-eletricos#padrao-energia) | `#padrao-energia` no código Next.js |
| Quadros e Disjuntores | Revisão de quadros elétricos | Reparo de disjuntores | [URL](https://eletrotecnicogo.com.br/servicos-eletricos#painel) | `#painel` no código Next.js |
| Solicitar Orçamento | Fale direto pelo WhatsApp | Informe serviço e cidade | [URL](https://eletrotecnicogo.com.br/servicos-eletricos#orcamento) | `#orcamento` no código Next.js |

Todos os textos propostos respeitam os limites de caracteres dos sitelinks e suas descrições (verificados antes do registro). **Cenário planejado** se aplicadas todas as decisões: **6 sitelinks elétricos** (3 antigos + 3 novos); com 4 atuais, substituição de 1 solar por 3 elétricos resulta em 6. A recomendação do Google de adicionar mais dois é, assim, considerada sem confundi-la com um erro de configuração.

## Checklist de execução (ainda não executado)

- [x] Receber e auditar CSV das quatro associações.
- [x] Conferir campanha, nível e status, descrições e URLs.
- [x] Identificar sitelink de limpeza solar associado à campanha elétrica e propor revisão.
- [x] Validar no código que as seis âncoras dos sitelinks elétricos existentes/propostos realmente existem: `#manutencao`, `#instalacao-predial`, `#inspecao`, `#padrao-energia`, `#painel`, `#orcamento`.
- [ ] Confirmar com responsável se o sitelink solar deve ser **desassociado somente desta campanha**, preservando eventual uso na campanha de limpeza solar.
- [ ] Aplicar três novos sitelinks e revisar vínculos na conta Google Ads **somente após autorização**.
- [ ] Validar se a recomendação do Google foi resolvida depois da edição.
- [ ] Confirmar **Locais** e configuração de `Presença` no nível da campanha com dados atuais, antes de encerrar a issue #15.

**Estado D1:** palavras positivas (27), negativas (20), anúncio (1) e sitelinks (4) inventariados. **Falta relatório/captura de locais** e decisão sobre sitelink solar. Nenhuma edição aplicada. Não reativar sem aprovação expressa.
