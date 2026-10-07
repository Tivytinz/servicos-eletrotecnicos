# Memória do Projeto — Eletrotécnico GO

Última atualização: 05/10/2026

## Visão geral

Projeto de landing pages para geração de contatos via WhatsApp para serviços eletrotécnicos em Goiânia e região.

### Marca
- Nome: **Eletrotécnico GO**
- Telefone / WhatsApp: **(62) 99326-5087**
- Link base do WhatsApp: `https://wa.me/5562993265087`
- Domínio principal: `https://eletrotecnicogo.com.br`

### Regiões atendidas
- Goiânia
- Aparecida de Goiânia
- Hidrolândia
- Senador Canedo
- Trindade

## Repositório e infraestrutura

- Repositório: `Tivytinz/servicos-eletrotecnicos`
- Branch principal: `main`
- Framework: Next.js
- Hospedagem: Railway
- Serviço Railway: `servicos-eletrotecnicos`
- Porta pública: `8080`
- URL temporária Railway:
  `https://servicos-eletrotecnicos-production.up.railway.app`

## Domínio e DNS

O domínio `eletrotecnicogo.com.br` foi registrado no Registro.br.

A hospedagem DNS foi migrada para Cloudflare por causa da limitação do Registro.br para CNAME no domínio raiz.

### Nameservers Cloudflare
- `dan.ns.cloudflare.com`
- `heidi.ns.cloudflare.com`

### Registro principal do Railway
- Tipo: CNAME
- Nome: `@`
- Destino: `8ttmvvd8.up.railway.app`
- Cloudflare Proxy: habilitado
- TXT de verificação Railway configurado em `_railway-verify`

O Railway já reconhece o domínio principal como verificado. O HTTPS/certificado ainda depende da conclusão da propagação DNS.

### WWW

O domínio `www.eletrotecnicogo.com.br` já foi preparado no Railway, mas ainda não foi concluído no DNS.

Registros necessários:

- CNAME
  - Nome: `www`
  - Destino: `ogstj4br.up.railway.app`

- TXT
  - Nome: `_railway-verify.www`
  - Valor:
    `railway-verify=19253297d98d535b6325420a18891251fadde2fe6d3f5d260a67df24697ef563`

O projeto já possui redirect permanente de `www` para o domínio raiz.

## Páginas existentes

### Página inicial
Rota: `/`

Objetivo:
- apresentar os serviços
- destacar limpeza de placas solares
- mostrar regiões atendidas
- gerar contato por WhatsApp

Serviços exibidos:
- Instalações elétricas
- Manutenção elétrica
- Quadros e circuitos
- Energia solar
- Limpeza de placas solares
- Inspeção elétrica

### Landing de serviços elétricos
Rota: `/servicos-eletricos`

Inclui:
- instalações elétricas
- manutenção elétrica
- quadros e circuitos
- inspeção elétrica
- regiões atendidas
- FAQ
- CTA de WhatsApp
- dados estruturados Service + FAQPage

### Landing de limpeza de placas solares
Rota: `/limpeza-de-placas-solares`

Inclui:
- hero próprio
- antes e depois real
- galeria de resultados reais
- regiões atendidas
- FAQ
- CTA de WhatsApp
- dados estruturados Service + FAQPage

## Fotos solares

Principais arquivos em uso:

- `public/solar/antes-hq.webp`
- `public/solar/depois-hq.webp`
- `public/solar/caso-2-antes.webp`
- `public/solar/caso-2-depois.webp`
- `public/solar/caso-3-antes.webp`
- `public/solar/caso-3-depois.webp`
- `public/solar/caso-4-antes.webp`
- `public/solar/caso-4-depois.webp`
- `public/solar/caso-5-antes.webp`
- `public/solar/caso-5-depois.webp`
- `public/solar/caso-6-antes.webp`
- `public/solar/caso-6-depois.webp`
- `public/solar/caso-7-antes.webp`
- `public/solar/caso-7-depois.webp`

Fotos antigas e não utilizadas já foram removidas do repositório.

## SEO já implementado

- `metadataBase`
- títulos e descrições
- canonical
- Open Graph
- Twitter Card
- sitemap
- robots.txt
- manifest
- favicon
- dados estruturados locais
- dados estruturados de serviço
- FAQ schema

Arquivos principais:
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/manifest.ts`
- `src/app/icon.tsx`

## Analytics e conversão

O projeto já está preparado para Google Analytics 4.

Variável esperada:
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

Evento principal:
- `whatsapp_click`

O evento registra:
- página
- título da página
- texto do CTA
- destino do link

O GA4 só deve carregar após consentimento do visitante.

Também existe suporte para verificação do Google Search Console por variável:

- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

## Privacidade

Rota:
- `/politica-de-privacidade`

Existe aviso de consentimento para Analytics com:
- Aceitar
- Recusar

## Segurança

O projeto já possui cabeçalhos básicos:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- remoção do header `X-Powered-By`

## Marketing preparado

Documentos existentes:
- `docs/google-business-profile.md`
- `docs/google-ads-plan.md`

Estratégia inicial:
- campanha de serviços elétricos
- campanha separada para limpeza de placas solares
- conversão principal: clique no WhatsApp
- segmentação por cidades atendidas

## Diretrizes de comunicação

Evitar promessas não comprovadas, como:
- aumento percentual garantido de geração solar
- economia garantida
- retorno financeiro garantido
- urgência falsa

Dar preferência a:
- atendimento local
- fotos reais
- orçamento direto
- linguagem objetiva
- segurança
- organização
- prova visual do serviço

## Pendências prioritárias

1. Aguardar Cloudflare ficar Active.
2. Confirmar propagação do domínio principal.
3. Confirmar certificado HTTPS válido no Railway.
4. Testar:
   - `https://eletrotecnicogo.com.br`
   - `https://eletrotecnicogo.com.br/servicos-eletricos`
   - `https://eletrotecnicogo.com.br/limpeza-de-placas-solares`
5. Ativar e testar `www`.
6. Criar/conectar Google Analytics 4.
7. Validar evento `whatsapp_click`.
8. Criar/conectar Google Search Console.
9. Enviar `sitemap.xml` ao Google.
10. Criar/revisar Google Business Profile.
11. Adicionar fotos reais de serviços elétricos quando disponíveis.
12. Só então iniciar Google Ads com orçamento controlado.

## Atualizações recentes

- DNS do domínio principal propagado e certificado HTTPS confirmado como válido no Railway.
- HSTS inicial habilitado com `max-age=86400`; ampliar depois que `www` também estiver com HTTPS válido.
- Endpoint `/api/health` marcado com `X-Robots-Tag: noindex, nofollow` e `/api/` bloqueado no robots.txt.
- Dependências estabilizadas: versões principais fixadas, Node 24.21.0, npm 11.19.0, TypeScript 6.0.2 e `package-lock.json` v3 versionado.
- Auditoria identificou as 5 vulnerabilidades altas na cadeia de desenvolvimento/lint (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`); todos esses pacotes aparecem como `dev: true` no lockfile. Não foi aplicado `npm audit fix --force` porque a correção sugerida exigia downgrade incompatível.
- Lint final passou sem erros e sem warnings; imagens da home e da landing solar foram migradas para `next/image`.
- Deploy final validado com build, healthcheck `/api/health` e inicialização do Next.js com sucesso.
- Auditoria de dependências: o build atual reportou 5 vulnerabilidades de severidade alta no conjunto instalado. A origem exata ainda precisa ser identificada; não aplicar `npm audit fix --force` sem revisão.
- Railway confirmado em Node 24.21.0, com healthcheck `/api/health` funcionando e watch patterns configurados para evitar deploys causados apenas por alterações em `docs/`.
- O build também sinalizou `eslint@9.39.5` como versão não suportada; atualizar junto da estabilização das dependências.

- Auditoria final de produção realizada em 06/10/2026: contraste de CTAs corrigido, healthcheck do Railway adicionado, restart policy configurada e runtime movido para Node 24 LTS.
- Relatório completo: `docs/auditoria-producao.md`.
- Revisão de conversão/mobile: CTAs principais agora ocupam a largura disponível em telas pequenas quando necessário.
- Corrigido o posicionamento do botão "Ver todos os serviços elétricos" na grade da home.
- Landing de serviços elétricos recebeu sinais de confiança: atendimento local, residencial/comercial e orçamento direto.
- Landing solar teve ajuste para evitar estouro horizontal do CTA em celulares estreitos.
- Acessibilidade melhorada com foco visível e suporte a `prefers-reduced-motion`.
- Evento `whatsapp_click` preparado para registrar contexto UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`).
- Favicon atualizado para emoji de raio ⚡ em fundo azul-marinho, alinhado à identidade visual do site.

## Estado visual atual

A identidade visual está consistente entre:
- home
- landing de serviços elétricos
- landing de limpeza solar

Padrão:
- fundo azul-marinho escuro
- amarelo/âmbar como cor principal
- verde para CTAs de WhatsApp
- cards escuros
- layout responsivo
- botão flutuante de WhatsApp

## Observação operacional

Sempre que houver mudança relevante em:
- domínio
- infraestrutura
- páginas
- telefone
- serviços
- campanhas
- analytics
- SEO
- regiões atendidas

atualizar este arquivo para manter o contexto do projeto sincronizado.
