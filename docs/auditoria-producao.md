# Auditoria Final de Produção — Eletrotécnico GO

Data: 06/10/2026

## Resumo executivo

O projeto está tecnicamente bem estruturado e compila com sucesso no Railway. As rotas principais, SEO técnico, sitemap, robots, política de privacidade, dados estruturados e conversão por WhatsApp estão implementados.

O lançamento público ainda depende da conclusão do DNS/HTTPS do domínio principal. Há também uma pendência de reprodutibilidade de dependências: o repositório ainda não possui `package-lock.json` e usa `latest` em dependências.

## Status por área

| Área | Status | Observação |
|---|---|---|
| Build Next.js | Aprovado | Build e geração das páginas concluídos com sucesso |
| Runtime Railway | Aprovado com ajuste | Healthcheck e restart policy adicionados durante a auditoria |
| Node.js | Corrigido | Engine alterada para Node 24 LTS |
| DNS domínio raiz | Bloqueador externo | Railway ainda aguarda o CNAME ficar visível |
| Certificado HTTPS | Bloqueador externo | Em validação enquanto DNS propaga |
| `www` | Pendente | Ainda precisa dos registros DNS no Cloudflare |
| SEO técnico | Aprovado | Metadata, canonical, Open Graph, sitemap e robots presentes |
| Dados estruturados | Aprovado | Electrician, Service e FAQPage implementados |
| WhatsApp | Aprovado | CTAs e mensagens por landing page configurados |
| Analytics | Preparado | Requer `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| Search Console | Preparado | Requer `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` |
| Privacidade | Aprovado | Política e consentimento para GA4 implementados |
| Acessibilidade | Aprovado com ajuste | Contraste dos CTAs verdes corrigido durante a auditoria |
| Imagens | Aprovado | 14 imagens solares referenciadas e presentes no repositório |
| Mobile | Aprovado | CTAs responsivos e proteção contra overflow implementados |
| Segurança HTTP | Parcial | Headers básicos presentes; HSTS/CSP ficam para depois do HTTPS |
| Dependências | Monitorar | Versões principais fixadas e `package-lock.json` criado. As 5 vulnerabilidades altas foram identificadas na cadeia de lint/dev (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`) |
| CI | Atenção | Não há pipeline separado executando lint + build em PRs |
| Monitoramento externo | Atenção | Railway healthcheck cobre deploy; falta uptime monitor contínuo |

## Correções aplicadas durante esta auditoria

- Contraste dos botões verdes alterado para melhorar legibilidade com texto branco.
- Endpoint `/api/health` criado.
- Railway configurado com healthcheck em `/api/health`.
- Timeout de healthcheck configurado em 30 segundos.
- Restart policy configurada como `ON_FAILURE`, com até 3 tentativas.
- Runtime atualizado de Node 20 para Node 24 LTS e confirmado em produção com Node 24.21.0.
- Healthcheck `/api/health` confirmado com sucesso no Railway.
- Watch patterns configurados no Railway para evitar deploy em alterações somente de documentação.
- As 5 vulnerabilidades altas foram identificadas. Todos os pacotes afetados aparecem com `dev: true` no lockfile e pertencem à cadeia de lint: `eslint-config-next`, `@next/eslint-plugin-next`, `fast-glob`, `micromatch` e `braces`.
- O alerta raiz é associado ao `braces@3.0.3` usado por essa cadeia de desenvolvimento. O npm sugere uma mudança incompatível para `eslint-config-next@14.2.35`; por isso não foi aplicado `npm audit fix --force`.
- O build reporta aviso de suporte do `eslint@9.39.5`; ESLint 10 foi testado e mostrou incompatibilidade com o plugin React usado pelo conjunto atual do Next.js, então foi mantida a versão 9 compatível.
- TypeScript foi fixado em 6.0.2 porque TypeScript 7 ainda não era suportado pelo `typescript-eslint` usado nessa configuração.
- `package-lock.json` v3 foi criado e validado contra as dependências declaradas.
- O lint final passou sem erros e sem warnings após migração das imagens para `next/image` e correção dos links internos/consentimento.

## Pontos fortes atuais

- Páginas estáticas principais são geradas no build.
- Não há banco de dados ou estado crítico local.
- O site usa WebP e lazy loading na galeria.
- Hero solar usa imagens prioritárias.
- URLs canônicas estão definidas.
- Sitemap inclui as páginas principais.
- Existe página 404 própria.
- Política de privacidade está acessível.
- GA4 só carrega após consentimento.
- Evento `whatsapp_click` inclui dados UTM quando presentes.
- Cabeçalhos básicos de segurança estão ativos.
- O número de WhatsApp está padronizado em todas as páginas.

## Pendências antes de anunciar

### Bloqueadores
1. Cloudflare ficar Active.
2. Railway reconhecer o CNAME do domínio raiz.
3. Certificado HTTPS ficar válido.
4. Testar o domínio real e as três páginas principais.
5. Finalizar o `www` e confirmar o redirect.

### Alta prioridade
1. Monitorar uma atualização compatível do toolchain do Next/ESLint que elimine a cadeia vulnerável sem downgrade do Next.js.
2. Manter `package-lock.json` versionado e revisar mudanças de dependências antes de atualizar.
3. Criar workflow no GitHub Actions para validar lint + build antes de mudanças chegarem à produção (a criação automática do workflow não foi permitida pela integração atual).

### Após HTTPS
1. Adicionar HSTS.
2. Avaliar Content-Security-Policy compatível com Google Analytics.
3. Ativar GA4.
4. Validar `whatsapp_click` em tempo real.
5. Verificar Search Console e enviar sitemap.
6. Configurar monitor externo de uptime.
7. Publicar Google Business Profile.
8. Só então ativar Google Ads.

## Conclusão

O site está próximo de produção e não foram encontrados erros de aplicação que impeçam o build ou a inicialização do serviço.

O principal impedimento atual é externo ao código: propagação DNS e emissão do certificado HTTPS.

A reprodutibilidade das dependências foi concluída e o lint/build final passou com healthcheck. O bloqueador restante para lançamento público continua sendo DNS/HTTPS. A cadeia vulnerável identificada está em dependências de desenvolvimento e deve permanecer monitorada até existir atualização compatível.
