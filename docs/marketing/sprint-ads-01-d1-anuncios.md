# Sprint Ads 01 — Inventário integral do anúncio responsivo (D1)

> Fonte: CSV `Relatório de anúncios.csv`, exportação do Google Ads de **06 a 09/10/2026**, enviado pelo responsável em 09/10/2026. **Arquivo UTF-16/TSV**. São **1 linha de anúncio** e **2 linhas agregadas de total**, não 3 anúncios. Este é um snapshot de período, não leitura ao vivo.
>
> **Escopo:** campanha `Pesquisa | Serviços Elétricos | Goiânia`. Campanha continua **pausada**; **não foi executada nenhuma modificação no Google Ads.**

## Inventário e reconciliação

| Campo | Valor auditado |
| --- | --- |
| Anúncios individuais listados | **1** |
| Tipo | **Anúncio responsivo de pesquisa** |
| Grupo | `Grupo de anúncios 1` |
| Estado do anúncio | `Ativado` |
| Elegibilidade | `Não qualificado` **exclusivamente porque a campanha está pausada** |
| Qualidade do anúncio | **Boa** |
| Melhoria recomendada pelo Google | **Adicionar mais 2 sitelinks ao anúncio** — não comprova ausência absoluta de recursos; verificar a aba `Recursos` |
| Títulos | **15/15**, todos com até 30 caracteres |
| Descrições | **4/4**, todas com até 90 caracteres |
| Posições fixadas/pins | **Nenhuma** (`--`) |
| URL final | https://eletrotecnicogo.com.br/servicos-eletricos |
| Caminho 1 / 2 | `servicos` / `eletricos` |
| URL final específica para mobile | Não informada; por padrão se usa a URL final |
| Modelo de rastreamento / sufixo URL | Em branco no anúncio; não significa falta de marcação automática no nível de conta |
| Impressões / cliques / CTR | **244 / 13 / 5,33%** |
| CPC médio / custo total | **R$ 6,58 / R$ 85,52** |
| Conversões atribuídas | **0** |

Os totais batem com os CSVs de palavras-chave e com o histórico da campanha. O próprio relatório não separa Goiânia/Aparecida em anúncios distintos; só há um RSA em `Grupo de anúncios 1`.

## Títulos do anúncio atual (transcrição do CSV)

| Nº | Título | Caracteres | Observação |
| ---: | --- | ---: | --- |
| 1 | Eletricista em Goiânia | 22 | Local Goiânia |
| 2 | Serviços Elétricos GO | 21 | Geral/marca/serviço |
| 3 | Manutenção Elétrica | 19 | Geral/marca/serviço |
| 4 | Instalação Elétrica | 19 | Geral/marca/serviço |
| 5 | Eletricista Residencial | 23 | Geral/marca/serviço |
| 6 | Eletricista Comercial | 21 | Geral/marca/serviço |
| 7 | Quadros e Disjuntores | 21 | Geral/marca/serviço |
| 8 | Inspeção Elétrica | 17 | Geral/marca/serviço |
| 9 | Aterramento Elétrico | 20 | Geral/marca/serviço |
| 10 | Reparo Elétrico Rápido | 22 | Validar promessa |
| 11 | Atendimento em Goiânia | 22 | Local Goiânia |
| 12 | Orçamento pelo WhatsApp | 23 | Geral/marca/serviço |
| 13 | Eletrotécnico GO | 16 | Geral/marca/serviço |
| 14 | Serviço Elétrico Local | 22 | Geral/marca/serviço |
| 15 | Chame no WhatsApp | 17 | Geral/marca/serviço |

## Descrições do anúncio atual (transcrição do CSV)

| Nº | Descrição | Caracteres | Observação |
| ---: | --- | ---: | --- |
| 1 | Serviços elétricos em Goiânia e região. Solicite seu orçamento direto pelo WhatsApp. | 84 | Manter/revisar estilo |
| 2 | Instalação, manutenção, quadros, disjuntores e inspeções para residências e comércios. | 86 | Manter/revisar estilo |
| 3 | Atendimento em Goiânia e cidades da região com orçamento rápido e direto pelo WhatsApp. | 87 | Confirmar promessa de prazo |
| 4 | Precisa de eletricista? Fale com o Eletrotécnico GO e peça orçamento pelo WhatsApp. | 83 | Manter/revisar estilo |

## Diagnóstico e decisões recomendadas (ainda não aplicadas)

1. **Não excluir nem recriar o anúncio à toa.** A qualidade indicada é **Boa**, o inventário já possui 15 títulos/4 descrições, URL final correta e todos os limites de texto respeitados. Aproveitar o grupo existente para Goiânia preserva histórico do grupo. Ao editar um RSA, parte do histórico de desempenho pode ser reiniciado para a nova versão; documentar texto antigo antes de editar.
2. **Grupo 01 — Goiânia:** sugerir trocar os títulos muito genéricos por alguns específicos de Goiânia e serviços reais, conservando títulos de intenção/localidade que já existem. Proposta de novo RSA completo em [plano de anúncios por cidade](./plano-google-ads-goiania-aparecida-2026-10-09.md). Não copiar título duplicado só para aumentar quantidade.
3. **Grupo 02 — Aparecida:** a ausência do nome **Aparecida de Goiânia** nos 15 títulos e 4 descrições do único RSA indica oportunidade de relevância local. Criar **RSA separado** em novo grupo, apontando inicialmente à **mesma landing** que menciona ambas as cidades. Geolocalização não é segregada por grupo, apenas a intenção textual.
4. **Revisar alegações antes de implantar:** o título `Reparo Elétrico Rápido` e a descrição com `orçamento rápido` indicam agilidade. Confirmar que a operação consegue cumprir essas expectativas; caso contrário, substituir por texto sem promessa de prazo. Não afirmar `24h`, `credenciado`, `menor preço` ou `gratuito` sem prova.
5. **Sitelinks:** o Google recomenda `Adicionar mais 2 sitelinks`, mas **não é possível inferir** do CSV quais recursos estão associados à campanha, aos grupos ou à conta. Conferir **Campanhas → Recursos → Sitelink** e seus URLs; somente então decidir criar mais dois recursos de fato.
6. **Mensuração:** a ausência de modelo de rastreamento no anúncio **não invalida** a codificação automática (confirmada anteriormente no Google Ads). A ação `Lead - WhatsApp` continua medida no GA4; **zero conversões** neste CSV não comprova falha de tag nem uma conversa efetiva.

## Status do D1 e próximos dados necessários

- [x] **27/27 palavras-chave positivas** (CSV anterior, [relatório de palavras-chave](./sprint-ads-01-d1-inventario-csv.md)).
- [x] **20/20 palavras-chave negativas** (CSV anterior, [auditoria de negativas](./sprint-ads-01-d1-negativas.md)).
- [x] **1/1 anúncio responsivo listado**: títulos, descrições, grupo, URL, estado, qualidade, melhorias, gastos e ausência de pinning conferidos.
- [x] **Recursos/Sitelinks:** CSV completo recebido (4 associações no nível campanha; 3 serviços elétricos + 1 de limpeza solar). [Auditoria dos sitelinks](./sprint-ads-01-d1-sitelinks.md).
- [ ] **Locais:** capturar tela de segmentação por presença e cidades ativas, verificando alterações após o histórico.
- [ ] Confirmar intenção sobre `Reparo Elétrico Rápido` e `orçamento rápido` antes da edição do anúncio.
- [ ] Revisar o plano final e obter aprovação operacional para alterações. **Não reativar sem autorização explícita.**

**Estado:** issue #15 em andamento apenas por pendências de recursos e locais; dias 2–5 não iniciados no Google Ads. Orçamento **R$20/dia** e estratégia **Maximizar cliques** preservados.
