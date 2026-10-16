# Auditoria SEO local — Eletrotécnico GO (16/10/2026)

## Evidências fornecidas pelo Search Console
- 3 URLs indexadas: `/`, `/servicos-eletricos`, `/limpeza-de-placas-solares`.
- 1 URL com redirecionamento (identidade da URL a confirmar).
- `/politica-de-privacidade`: descoberta, mas não indexada. Sem indício de impacto imediato na captação comercial.
- Desempenho mostrado: 6 impressões, 0 cliques, posição média 24,8. Amostra pequena: não inferir tendências.

## Auditoria estática do repositório
- Next.js App Router gera `robots.txt` por `src/app/robots.ts` e `sitemap.xml` por `src/app/sitemap.ts`.
- Sitemap inclui as três páginas comerciais e a política de privacidade.
- Metadados globais e específicos incluem title, description, Open Graph e canonicals por página.
- A configuração contém redirecionamento permanente de `www` para domínio sem `www`.
- Há JSON-LD `Electrician` na home e `Service` nas páginas comerciais; há `FAQPage` nas páginas de serviço. O FAQ markup não implica apresentação de rich results em pesquisas comuns.
- As páginas comerciais oferecem contato por WhatsApp e a home possui links internos para ambas.
- Correção aplicada nesta branch: remover oferta genérica de manutenção solar na página inicial e metadados; manter somente os serviços elétricos e a limpeza de placas solares já anunciados.

## Verificações ainda necessárias antes do merge/deploy
1. Executar `npm ci && npm run lint && npm run build` (conferir scripts no `package.json`).
2. Conferir respostas públicas 200/301, HTML renderizado, canonical, robots e sitemap na produção; esta auditoria não equivale a uma verificação HTTP em produção.
3. Verificar a URL exata do redirecionamento reportado pelo Search Console; manter se for intencional.
4. Validar dados estruturados com schema.org / Rich Results Test, sem prometer rich snippets.
5. Confirmar que o Perfil da Empresa no Google corresponde a serviço e área atendida reais; não inventar endereço, avaliações, atendimento 24h ou certificações.
6. Após publicação, acompanhar desempenho por consulta, página e região por 28 dias ou mais; separar tráfego orgânico de Google Ads e medir contatos qualificados de WhatsApp.

## Não fazer
- Não criar páginas duplicadas apenas trocando o nome da cidade.
- Não adicionar `lastmod` fictício ao sitemap ou dados estruturados sem evidência.
- Não retirar a política de privacidade por estar não indexada.
- Não afirmar que correções garantem ranking.
