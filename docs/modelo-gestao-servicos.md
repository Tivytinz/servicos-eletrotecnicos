# Modelo de gestão de serviços — Eletrotécnico GO

**Estado:** especificação inicial aprovada para modelagem; **não implementado**.  
**Produto e propriedade pretendida:** Eletrotécnico GO.  
**Escopo:** operação própria de serviços eletrotécnicos, não um SaaS multiempresa para terceiros nesta fase.

## 1. Decisão de produto e titularidade

O sistema será desenvolvido neste repositório para atender o fluxo real do **Eletrotécnico GO** e será tratado como **ativo do Eletrotécnico GO**, não como produto pessoal separado nem como licença do autor ao negócio. Não anunciar, licenciar ou comercializar o código para outras empresas sem nova decisão formal dos titulares.

**Importante:** documentar essa intenção no GitHub não transfere automaticamente direitos patrimoniais de software. Formalizar por instrumento apropriado quem é o titular jurídico (pessoa física ou jurídica, conforme constituição da empresa), contribuições de Victor e Carlos, direitos sobre código, marca, domínio, dados, acesso e eventual reutilização futura. O repositório público não equivale a licença de uso por terceiros; não acrescentar licença permissiva sem decisão expressa.

## 2. Objetivo operacional

Centralizar o caminho de **lead → atendimento → orçamento → aprovação → execução → recebimento → fechamento financeiro**, com rastreabilidade de responsáveis, custos, origens de clientes e resultado de cada serviço.

O sistema deve respeitar o processo escolhido por Victor e Carlos e **não substituir a landing page pública** nem prejudicar SEO, campanhas, WhatsApp, consentimento ou conversões existentes.

## 3. Papéis e responsabilidades

- **Victor:** captação, origem comercial, marketing/tráfego, registro e acompanhamento de leads, acompanhamento financeiro e conciliação de mídia.
- **Carlos:** avaliação técnica, proposta técnica, agendamento e execução do serviço, materiais e deslocamento, evidências de conclusão.
- **Administração do negócio:** acesso ao fechamento, ajustes auditáveis, caixa, pagamentos e relatórios. Definir permissões efetivas por operação; não assumir que cada papel só pode executar as ações acima.

**Participação societária escolhida:** 50% Victor e 50% Carlos. Os percentuais de distribuição operacional descritos adiante **não alteram** essa participação.

## 4. Fluxo canônico

1. **Entrada:** lead de Google Ads, site, WhatsApp, indicação ou outro canal. Registrar origem conhecida e parâmetros UTM quando houver evidência; não inferir venda a partir de clique.
2. **Qualificação:** registrar cliente, contato, município, endereço do serviço, demanda, fotos e observações. Evitar duplicar contato sem verificação.
3. **Avaliação e orçamento:** especificar serviço, materiais previstos, deslocamento estimado, preço proposto, validade e condições. Orçamento tem versão; aceite refere-se a uma versão.
4. **Aprovação:** cliente aprova ou recusa o orçamento. Somente orçamento aprovado pode virar OS executável.
5. **Ordem de serviço:** designar responsável, data, status, checklist e custos reais; registrar mudanças e impedimentos.
6. **Conclusão:** registrar trabalho realizado, evidências e aceite/pendências do cliente, sem presumir pagamento.
7. **Recebimento:** registrar pagamento efetivamente recebido, data, meio, valor e eventuais parcelas/estornos. Serviço concluído não equivale a serviço pago.
8. **Apuração por recebimento:** descontar materiais e deslocamento elegíveis e provisionar anúncios, depois calcular distribuição do saldo, com trilha de auditoria.
9. **Fechamento mensal:** conciliar gasto real em anúncios, provisões, aportes/reembolsos e saldo reservado no caixa da empresa.

### Estados sugeridos

- Lead: `novo → qualificado → orçamento_em_preparo → orçamento_enviado → aprovado | recusado | perdido`.
- OS: `aberta → agendada → em_execução → concluída | cancelada` (com `bloqueada` ou `pendente` quando necessário).
- Financeiro: `não_recebido → parcialmente_recebido → recebido`; estorno é evento próprio e não deve apagar histórico.
- Registrar autor, data e motivo das transições sensíveis; validar transições no servidor.

## 5. Regra financeira escolhida

**Base de cálculo:** valores **efetivamente recebidos**, não apenas faturados.

Para cada serviço/recebimento elegível:

1. Registrar **receita recebida**.
2. Deduzir **materiais** efetivamente atribuídos ao serviço.
3. Deduzir **deslocamento = quilômetros totais de ida e volta × R$ 1,20/km** (valor parametrizável e registrado como snapshot na apuração).
4. Separar **provisão de anúncios = 10% da receita recebida**.
5. Calcular **saldo distribuível = receita recebida − materiais − deslocamento − provisão de anúncios**.
6. Se o saldo for positivo, destinar **20% à empresa, 24% a Victor e 56% a Carlos**.
7. Se o saldo for zero ou negativo, **não distribuir valores positivos**; registrar déficit e tratar compensação/aporte de modo explícito, sem apagar custos.

**Exemplo didático:** recebimento de R$ 1.000; material R$ 150; 40 km × R$ 1,20 = R$ 48; provisão anúncios R$ 100. Saldo distribuível = R$ 702. Empresa R$ 140,40; Victor R$ 168,48; Carlos R$ 393,12. A provisão de R$ 100 é separada e **não integra** esses três percentuais.

**Cuidado com recebimentos parciais:** não deduzir os mesmos custos integrais duas vezes. A apuração deve ter vínculo ao serviço e um livro-razão idempotente por recebimento/custo/distribuição; definir política explícita de alocação de custos e provisões antes de implementar parcelamento.

### Fechamento mensal de anúncios

- Conferir gasto real em mídia por período e origem de dados.
- Conciliar provisões acumuladas com despesa real; **não descontar anúncios uma segunda vez do saldo já distribuído**.
- Reembolsar aportes pessoais comprovados conforme a conciliação e registrar credor, valor e comprovante.
- Sobra de provisão permanece no **caixa da empresa**, visando reserva operacional de **R$ 1.200**; a meta é de caixa, não receita ou lucro.
- Insuficiência é coberta pelo caixa disponível ou por aporte conjunto deliberado e registrado.
- Diferenciar custos de anúncios, custos de serviço, provisões, aportes, distribuição operacional e patrimônio dos sócios.
- Antes da operação real, definir com contabilidade o tratamento de tributos, retiradas, distribuição de lucros e documentação fiscal. **Não presumir isenção tributária.**

## 6. MVP — funcionalidades prioritárias

1. Login e acesso administrativo protegido; papéis e autorização verificados no servidor.
2. Cadastro e histórico de clientes/leads, origem e responsável.
3. Orçamentos versionados, aprovação registrada e geração de OS.
4. OS com status, agendamento, execução, materiais, km e anexos protegidos.
5. Registro de recebimentos e despesas com apuração por serviço.
6. Painel financeiro e fechamento mensal de anúncios com histórico imutável de ajustes.
7. Exportação simples para conferência e prestação de contas.

**Fora do MVP:** emissão de NF-e/NFS-e, integração automática bancária, pagamentos automáticos, marketplace, app nativo, integração oficial de WhatsApp, multiempresa para clientes externos e venda de assinaturas.

## 7. Modelo de dados conceitual

- `usuarios`, `papeis`/`permissoes` e sessões
- `clientes`, `leads` e `origens_lead`
- `orcamentos`, `orcamento_versoes`, `orcamento_itens`, `aceites`
- `ordens_servico`, `os_eventos`, `os_anexos`
- `custos_servico` (tipo, valor, km, tarifa_snapshot, comprovante)
- `recebimentos` (valor, data, meio, status, referência externa única)
- `apuracoes` e `lancamentos_financeiros` (eventos de entrada, custo, provisão, distribuição, estorno, ajuste)
- `despesas_anuncios`, `aportes`, `fechamentos_mensais`
- `auditoria` (ator, ação, entidade, antes/depois quando apropriado, timestamp)

Valores monetários em centavos inteiros/decimal exato; regras de arredondamento explícitas; referências únicas e transações para evitar lançamentos duplicados.

## 8. Segurança, privacidade e implantação

- A aplicação atual é **landing page Next.js/TypeScript** sem módulo de gestão, banco, autenticação ou financeiro implementado.
- Construir a gestão em **rotas protegidas**, mantendo páginas públicas e tracking existentes independentes.
- Exigir autenticação, autorização por recurso, segregação de ambientes, backups/restauração testada, validação server-side, limites de upload e logs sem dados sensíveis.
- Não expor dados de clientes, custos, pagamentos, chaves ou relatórios em páginas públicas ou repositório.
- Adequar avisos, retenção e controles à LGPD e ao uso efetivo dos dados.
- Escolher banco, autenticação e estratégia de migrations antes da implementação; não inferir que a stack atual já os oferece.
- CI: testes de regra financeira, transições de estado, permissões, idempotência, regressão das landings e build. Deploy só após revisão e validação.

## 9. Critérios de aceite da primeira entrega funcional

- Lead pode virar orçamento aprovado e OS sem perda de histórico.
- OS concluída não é automaticamente considerada paga.
- Recebimento de R$ 1.000 no exemplo produz valores exatos da seção 5.
- Tentativa de registrar duas vezes o mesmo recebimento não duplica distribuições.
- Custos e estornos geram ajustes auditáveis, não reescrita silenciosa de saldo.
- Fechamento de anúncios reconcilia provisões e gastos sem dupla dedução.
- Usuário não autorizado não acessa financeiro, documentos ou dados de clientes.
- Home, páginas de serviços, WhatsApp, consentimento e SEO continuam funcionando.

## 10. Etapas de execução

1. **Modelagem (esta entrega):** escopo, propriedade pretendida, fluxo, finanças, entidades e critérios de aceite.
2. **Base técnica:** banco, migrations, autenticação, autorização, testes de domínio e rotas privadas.
3. **Operação:** leads, clientes, orçamentos e OS.
4. **Financeiro:** recebimentos, custos, provisões, distribuições e fechamento.
5. **Piloto real:** usar casos do Eletrotécnico GO, conferir com Victor/Carlos, corrigir discrepâncias e só então liberar para rotina.

**Status em 16/10/2026:** etapa 1 documentada; nenhuma tela, API, banco ou regra financeira foi implementada por esta especificação.
