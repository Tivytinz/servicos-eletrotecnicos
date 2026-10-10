# Auditoria: Consent Mode v2 e importação GA4 → Google Ads

## Contexto
- Conversão importada no Google Ads: `Lead - WhatsApp`, originada do evento GA4 `whatsapp_click`.
- Auditoria manual da campanha (06–09/10/2026) mostrou um `whatsapp_click` em `google / cpc` no GA4 e zero conversões atribuídas no Google Ads.
- Ações de conversão e marcação automática já foram verificadas na interface; **isso não identifica a causa definitiva do zero no Google Ads**.
- O código anterior concedia apenas `analytics_storage`, mantendo `ad_storage` e `ad_user_data` negados mesmo após o usuário aceitar o Analytics.

## Modelo de consentimento
- Sem escolha: os quatro sinais do Consent Mode v2 iniciam `denied`.
- **Apenas GA4**: `analytics_storage=granted`; os três sinais de anúncios continuam `denied`.
- **GA4 + medição de anúncios**: `analytics_storage=granted`, `ad_storage=granted`, `ad_user_data=granted`, `ad_personalization=denied`.
- **Recusar**: todos permanecem `denied`. O WhatsApp continua acessível.
- É sempre possível revisar as escolhas no botão **Privacidade**. Desligar análise desliga também medição de anúncios.
- As preferências são salvas em `eletrotecnico_go_consent_v2`. O valor legado `accepted` é tratado estritamente como aceite **somente para Analytics** e abre as novas opções. Um legado `rejected` continua recusado, sem forçar novo aceite.
- O `gtag.js` só é carregado após a escolha por Analytics (modo básico de consentimento); o evento `whatsapp_click` continua sem disparo para GA4 quando Analytics foi recusado.
- Anúncios personalizados/remarketing **não** são habilitados automaticamente.

## Validação automatizada
1. `npm run check` (lint, testes unitários, build).
2. Teste local do navegador (Playwright) usando um ID GA4 fictício apenas no CI. Confere valores na fila `dataLayer`, a ordem de comandos, as opções do banner, persistência, migração de preferência anterior, recusa e revogação.
3. O CI **não envia eventos reais para uma propriedade GA4**; a validação da atribuição no Google Ads exige dados de tráfego genuíno.

## Validação manual obrigatória antes do merge/publicação
1. Abrir uma janela privada e usar o **Tag Assistant** no ambiente de teste/pré-visualização com GA4 configurado. Verificar `default` negado antes de qualquer evento.
2. Selecionar somente **Análise de visitas**. Confirmar `analytics_storage=granted`, `ad_storage=denied`, `ad_user_data=denied`, `ad_personalization=denied`; gerar um clique no CTA e observar `whatsapp_click` no GA4 DebugView.
3. Voltar a **Privacidade**, conceder **Medição de anúncios** e verificar que `ad_storage` e `ad_user_data` mudaram para `granted`, mantendo `ad_personalization=denied`.
4. Reabrir preferências, clicar **Recusar opcionais** e confirmar que os quatro sinais mudaram para `denied` e que um novo `whatsapp_click` não é enviado ao GA4.
5. Em outro navegador privado, testar sem consentimento: nenhum `gtag.js` deve carregar antes do aceite.
6. Verificar desktop, celular, leitores de tela básicos e links da política de privacidade.
7. Só após publicação acompanhar eventos `google / cpc` no GA4, status da ação `Lead - WhatsApp` no Ads e origem real das mensagens recebidas; não assumir melhoria imediata ou retroativa de atribuição.

Documentação oficial:
- https://developers.google.com/tag-platform/security/guides/consent
- https://support.google.com/analytics/answer/13802165?hl=pt-BR
- https://support.google.com/analytics/answer/14275483?hl=pt-BR

Não alteramos configuração das campanhas, lance ou orçamento.
