# Histórico da auditoria Google Ads — Eletrotécnico GO

Atualizado em **08/10/2026**. Registro baseado em prints enviados durante a configuração; dados mudam ao longo do tempo. Valores de desempenho são snapshots, não relatórios em tempo real.

## Estrutura e orçamento
- **Pesquisa | Serviços Elétricos | Goiânia**: campanha existente, Pesquisa Google, **R$ 20/dia**, maximizar cliques.
- **☀️ Pesquisa | Energia Solar | Goiânia**: campanha publicada em 08/10/2026, Pesquisa Google, **R$ 20/dia**, maximizar cliques, objetivo Leads.
- Investimento médio combinado **R$ 40/dia**. Em 30,4 dias, **R$ 1.216** de referência mensal, sujeito às regras de faturamento do Google.
- Áreas da solar: **Goiânia, Aparecida de Goiânia, Hidrolândia, Senador Canedo e Trindade**; idioma português; Pesquisa Google, sem Display/parceiros (segundo revisão).
- Na revisão, personalização de texto e expansão de URL da IA Max constaram **desativadas**.
- Landing page solar: https://eletrotecnicogo.com.br/limpeza-de-placas-solares ; elétrica: https://eletrotecnicogo.com.br/servicos-eletricos .

## Anúncios, palavras-chave e recursos
- Solar: **1 anúncio responsivo** qualificado; **qualidade do anúncio pendente** em print de 08/10, não inferir que foi reprovado; pontuação de otimização **91,3%** (não é resultado comercial).
- Palavras-chave solares: começou com **13**, ampliada para **18** em correspondência de frase/exata. Algumas expressões de cidade tiveram status *baixo volume de pesquisas*. Novas palavras em análise incluíam "limpeza de placas fotovoltaicas", "lavagem de painel solar" e "limpeza de módulos fotovoltaicos".
- Solar: negativas cadastradas no nível **Campanha**, em correspondência ampla negativa, para emprego, curso, gratuito, comprar etc.; quantidade total não auditada integralmente.
- **5 sitelinks** qualificados: Limpeza de Placas Solares, Solicitar Orçamento, Resultados Reais, Regiões Atendidas, Como Funciona a Limpeza. Destinos previstos na landing page: raiz, `#orcamento`, `#resultados`, `#regioes`, `#como-funciona`. O usuário confirmou teste de `#regioes`; validar demais URLs individualmente.
- Recurso de chamadas e mensagens WhatsApp da campanha solar configurados com número comercial. Preservar a distinção entre clique em WhatsApp, conversa iniciada e ligação efetiva.

## Conversões / atribuição
- Ação **Lead - WhatsApp** importada do GA4, evento `whatsapp_click`, meta Contatos, ação principal, contagem Uma, janela de clique 90 dias.
- Ação **Conversation started** hospedada pelo Google, meta Leads de mensagens, principal, contagem Uma, janela de clique 30 dias.
- Ação **Chamadas a partir de anúncios** criada em 08/10/2026, meta Leads de chamada, principal, contagem Uma, duração mínima 60 segundos, janela de clique 30 dias, **Não usar valor**.
- Metas associadas: **elétrica** = Contatos + Leads de chamada; **solar** = Contatos + Leads de mensagens + Leads de chamada (prints de resumo de metas: chamada 2/2, contato 2/2, mensagens 1/2).
- Status das ações ainda **Conversões pendentes / Requer atenção** em 08/10. O próprio Google informa até 48h para novas ações serem registradas. Isso **não prova** falha nem comprova atribuição.
- Testes em GA4 DebugView com Tag Assistant conectado mostraram `whatsapp_click` disparando em cliques reais; testes incluíram as duas landing pages. Quatro cliques contados em janela de 30 min não equivalem a quatro leads comerciais. **Atribuição Google Ads ainda não comprovada**.

## Snapshot de lançamento / pendências
- No relatório de **08/10/2026**, solar: **2 impressões, 0 cliques, R$ 0 custo, 0 conversões**, muito cedo para análise estatística.
- Status solar **Qualificada (limitada)**, justificativas exibidas pelo Google: palavras-chave relevantes insuficientes + estratégia de lances em fase de aprendizado. Não subir orçamento só para limpar aviso.
- Prioridades: (1) acompanhar termos de pesquisa reais e negativas, (2) validar URLs restantes dos sitelinks, (3) verificar registro de conversões atribuídas após tráfego genuíno, (4) acompanhar chamadas qualificadas, (5) avaliar CTR, CPC, custo por lead e qualidade dos leads após dados suficientes.
- Não presumir alterações automáticas feitas no Google Ads: esta documentação é apenas histórico da auditoria.
