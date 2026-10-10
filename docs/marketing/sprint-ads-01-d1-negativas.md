# Auditoria de palavras-chave negativas — Sprint Ads 01 / Dia 1

> Fonte: CSV `Relatório de palavras-chave negativas (2).csv`, enviado pelo responsável em 09/10/2026, relatório **Todo o período**. Arquivo UTF-16, tabulado. Inventário obtido da exportação, não de acesso autenticado ao Google Ads em tempo real.

## Resultado validado

| Indicador | Constatação |
| --- | --- |
| Quantidade total de negativas no CSV | **20** |
| Campanha | **⚡ Pesquisa \| Serviços Elétricos \| Goiânia** |
| Tipo | Todas como **Palavra-chave**, não como lista compartilhada |
| Nível | Todas no **nível Campanha**; grupo de anúncios `--` |
| Correspondência | **20/20 correspondência ampla negativa** |
| Proposta: manter | **15** |
| Proposta: revisar | **3** (`loja`, `material elétrico`, `comprar`) |
| Proposta: revisar condicionado à política comercial | **2** (`grátis`, `gratuito`) |
| Negativas citando cidade, bairro, eletricista ou padrão de energia diretamente | **0** |
| Negativas `orçamento` e `preço` | **Não presentes** |

**Importante:** negativa ampla não funciona como correspondência ampla positiva. Uma negativa ampla de dois termos exige os termos da negativa na consulta (em qualquer ordem); e as negativas não capturam automaticamente todas as variantes próximas da mesma forma que palavras positivas. Manter os pares singular/plural não caracteriza erro ou duplicação de gasto. Uma busca pode ser barrada caso contenha uma negativa, sem que haja cobrança de clique — não há evidência de que algum cliente efetivo foi perdido.

## Inventário integral e parecer de cada negativa

| Nº | Negativa | Decisão proposta, não aplicada | Justificativa |
| ---: | --- | --- | --- |
| 1 | `salários` | Manter | Intenção profissional, não contratação de serviços |
| 2 | `salário` | Manter | Intenção profissional, não contratação de serviços |
| 3 | `curso` | Manter | Busca por formação; não prestação de serviços |
| 4 | `material elétrico` | Revisar | Negativa ampla com dois termos: pode bloquear consultas que contenham ambos, inclusive algumas relacionadas a serviços; não bloqueia buscas contendo apenas um deles |
| 5 | `grátis` | Revisar condicionado | Pode barrar consulta com 'orçamento grátis', caso orçamento sem custo faça parte da oferta; não há confirmação comercial |
| 6 | `atacado` | Manter | Intenção de atacado/compra, fora da contratação |
| 7 | `cursos` | Manter | Variação plural de formação; não equivalente automática garantida nas negativas |
| 8 | `tutorial` | Manter | Intenção faça-você-mesmo/informativa |
| 9 | `comprar` | Revisar | Normalmente intenção de adquirir materiais, mas pode excluir alguma consulta comercial relevante |
| 10 | `faça você mesmo` | Manter | Intenção faça-você-mesmo/informativa |
| 11 | `loja` | Revisar prioritário | Pode bloquear 'eletricista para loja em Goiânia', serviço comercial oferecido |
| 12 | `empregos` | Manter | Busca por contratação profissional/emprego |
| 13 | `gratuito` | Revisar condicionado | Mesma ressalva de 'grátis', dependendo de eventual oferta de orçamento sem custo |
| 14 | `apostila` | Manter | Intenção material didático |
| 15 | `pdf` | Manter | Intenção material informativo |
| 16 | `como fazer` | Manter | Intenção de instruções/DIY |
| 17 | `emprego` | Manter | Busca por vaga |
| 18 | `aprender` | Manter | Intenção educacional |
| 19 | `vagas` | Manter | Busca por vaga |
| 20 | `vaga` | Manter | Busca por vaga |

## Riscos concretos a conferir

1. **`loja` (revisar primeiro):** o negócio presta serviços residenciais **e comerciais**. Exemplo hipotético de consulta potencialmente relevante: **"eletricista para loja em Goiânia"**. Essa negativa ampla pode impedir a participação do anúncio. Recomendar teste **sem a negativa** *apenas após aprovação*, usando relatório de termos pesquisados e observação do tráfego comercial.
2. **`material elétrico`:** pesquisa hipotética sobre **instalação de material elétrico** pode conter os dois termos negativos; ainda assim, muitas consultas envolvendo "material elétrico" têm intenção de comprar peças. Avaliar custo-benefício; não remover sem motivo.
3. **`comprar`:** geralmente filtra buscas de peças/produtos, mas pode bloquear alguma formulação de contratação. Prioridade menor que `loja`.
4. **`grátis` e `gratuito`:** podem barrar buscas por orçamento sem custo, **se** a empresa realmente oferecer esse formato. Sem essa confirmação, manter as duas negativas; não prometer orçamento gratuito nas peças.

## Itens coerentes para manutenção

`salários`, `salário`, `curso`, `atacado`, `cursos`, `tutorial`, `faça você mesmo`, `empregos`, `apostila`, `pdf`, `como fazer`, `emprego`, `aprender`, `vagas`, `vaga`.

As formas singulares/plurais separadas podem ser relevantes em negativas, dado que a correspondência negativa não abrange todas as variantes próximas. Não apagar unicamente por semelhança de grafia.

## Ações e pendências da sprint

- [x] Conferir CSV completo de **20/20 negativas**, tipo de correspondência e escopo **campanha**.
- [x] Identificar risco de bloqueio de busca comercial na negativa `loja`; avaliar também `material elétrico` e `comprar`.
- [x] Confirmar que `preço`, `orçamento`, nomes das duas cidades e `padrão de energia` não constam no CSV.
- [ ] Verificar **Anúncios** com títulos, descrições, URL final, status e grupo, preferencialmente CSV exportado do Google Ads.
- [ ] Conferir **Recursos** (sitelinks/chamada) e **Locais**, se não estiverem visíveis no relatório de anúncios.
- [ ] Aplicar mudanças em negativas ou grupos **somente após aprovação**; salvar estado anterior e posterior.

**Campanha elétrica:** continua pausada; orçamento R$20/dia, Maximizar cliques. **Nenhuma negativa, palavra positiva, anúncio, campanha ou meta de conversão foi modificada.** Campanha solar intocada.

**Referências locais:** [inventário de keywords com 27/27 itens](./sprint-ads-01-d1-inventario-csv.md), [Sprint Ads 01](./sprint-ads-01-goiania-aparecida.md) e [plano de dois RSAs](./plano-google-ads-goiania-aparecida-2026-10-09.md).
