# Identificação de origem Google Ads no WhatsApp

## Objetivo
Identificar no **texto pré-preenchido** dos contatos que vieram de uma visita com sinais explícitos de anúncio pago do Google, sem confundir tráfego orgânico com campanhas pagas.

## Condições de classificação
- **Marcador Google Ads** quando a URL contém `gclid`, `gbraid` ou `wbraid` com valor; ou o par `utm_source=google` e `utm_medium=cpc` (também `ppc`, `paidsearch` ou `paid_search`, sem distinção de maiúsculas).
- `utm_source=google` sozinho, `utm_medium=organic`, fonte Facebook ou acesso direto **não** geram marcador de anúncio.
- A página mantém durante até 30 minutos, na sessão do navegador, apenas um horário-limite referente à origem paga, para permitir navegação entre páginas. **Não salva o valor do identificador de clique e não o envia ao WhatsApp.**
- Uma chegada explicitamente identificada de outra campanha limpa o marcador anterior.
- O texto enviado via WhatsApp continua editável pelo visitante. A existência ou ausência do marcador **não comprova atribuição no Google Ads**.

## Mensagem pré-preenchida
Para visita com sinal de Google Ads, adiciona uma linha ao texto original da página:
```text
[Origem: anúncio do Google]
Olá, vi a página de serviços elétricos do Eletrotécnico GO e gostaria de solicitar um orçamento.
```

Visita sem sinal suficiente mantém a mensagem existente, sem rótulo de orgânico ou pago.

## Implementação
- `src/lib/whatsapp-source.ts`: regras puras, tipadas, testáveis; marcador sem duplicação.
- `src/app/whatsapp-source.tsx`: escuta capturada em `window` antes do listener `document` do analytics; adapta links de WhatsApp em todas as páginas.
- `src/app/layout.tsx`: componente instalado uma vez no layout.
- `src/app/analytics.tsx`: **não alterado**; evento `whatsapp_click` continua sujeito à escolha de privacidade já implementada.
- `src/app/politica-de-privacidade/page.tsx`: informa o funcionamento do indicador temporário.
- `tests/whatsapp-source.test.mjs`: testes automatizados executados por `npm run check`.

## Conferência manual antes do deploy
1. Abrir `/servicos-eletricos?gclid=teste` em aba privada, clicar no botão de orçamento e verificar o marcador **[Origem: anúncio do Google]** na mensagem pré-preenchida.
2. Repetir com `?utm_source=google&utm_medium=cpc` e na página de limpeza de placas solares.
3. Abrir em outra aba privada `/servicos-eletricos?utm_source=google&utm_medium=organic` e conferir mensagem **sem** marcador.
4. Abrir `/servicos-eletricos` sem parâmetros e conferir mensagem genérica.
5. Navegar entre páginas após chegada de anúncio e testar em até 30 minutos.
6. Confirmar clique `whatsapp_click` no GA4 DebugView após aceitar medição; a ocorrência no GA4 **não equivale** a conversa iniciada.
7. Repetir no celular e conferir que a página e WhatsApp continuam funcionando.

**Nota:** a URL de teste com `gclid=teste` testa a lógica do site, não constitui clique real de anúncio ou conversão atribuída. Muitos cliques pagos usam auto-tagging do Google Ads, mas parâmetros podem não estar disponíveis em todos os acessos.
