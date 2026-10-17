# Instruções para agentes — Eletrotécnico GO

Este arquivo é a entrada obrigatória para agentes de IA, assistentes de código e colaboradores automatizados deste repositório.

## Leitura inicial (nesta ordem)

1. [MEMORIA.md](MEMORIA.md): checkpoint operacional e prioridades.
2. [README.md](README.md): visão geral da aplicação (verifique se há trechos desatualizados).
3. [docs/modelo-gestao-servicos.md](docs/modelo-gestao-servicos.md): regras e visão do módulo interno.
4. [docs/gestao-autenticacao-leads.md](docs/gestao-autenticacao-leads.md): estado de segurança, riscos e pendências.
5. Documentação, código, migrations e testes diretamente relacionados à tarefa.

Se houver divergência entre documentos e código, investigue o comportamento implementado e o deploy efetivo; registre a divergência. Nunca assuma que um plano representa uma funcionalidade pronta.

## Princípios de trabalho

- Distinguir **implementado**, **testado**, **implantado**, **desativado** e **planejado**.
- Antes de mudar código, verificar a `main`, PRs abertas, histórico relevante e o estado da produção.
- Trabalhar em branch, abrir PR, executar `npm run check` (lint, testes e build) e confirmar CI antes de integrar. Nunca afirmar aprovação sem evidência.
- Manter alterações pequenas e rastreáveis; não reescrever histórico de migrations aplicadas.
- Após mudança durável, atualizar [MEMORIA.md](MEMORIA.md) e a documentação técnica específica na mesma PR. Registrar PR/commit, testes, implantação e pendências.
- Nunca incluir senhas, tokens, URLs com credenciais, cookies ou dados pessoais reais em código, commits, documentação, logs ou mensagens.
- Não publicar dados internos, URLs privadas ou variáveis sensíveis.

## Produção e banco

- Aplicação pública Next.js/TypeScript/Tailwind hospedada no Railway. Módulo `/gestao` usa PostgreSQL privado.
- A flag `GESTAO_HABILITADA` deve permanecer desativada até autorização explícita do responsável. O conector Railway pode ocultar valores: **não afirmar o valor atual sem confirmação**.
- **Não** executar migrations, `UPDATE`/`DELETE`, criação de usuários, alterações de roles ou testes com escrita no banco de produção sem autorização específica e plano de reversão.
- Usar banco descartável para testes PostgreSQL. Nunca usar `DATABASE_URL` de produção como variável de testes.
- Aplicação utiliza role restrita; não introduzir credenciais administrativas no serviço web.
- Volume persistente **não** é backup. Não habilitar backup pago nem serviços adicionais sem autorização; não prometer recuperação de dados.
- Verificar checksum da migration 004 contra `gestao.schema_migrations` antes de qualquer nova migration.

## Segurança e qualidade

- Toda Server Action e rota interna deve verificar sessão e autorização **no servidor**. Esconder botão não é controle de acesso.
- Manter SQL parametrizado, validação de entrada, cookies de sessão seguros e verificação de origem.
- Controle de login: 5 tentativas por identificador e 300 globais em 15 minutos; o limite global pode causar bloqueio coletivo, não substitui mitigação na borda.
- Cobrir casos permitidos e negados, especialmente sessão expirada, usuário inativo, RBAC, CSRF e ausência de escrita em operações não autorizadas.
- Evitar tracking de marketing no painel interno e proteger dados pessoais conforme LGPD.

## Registro e continuidade

- Atualizar o checkpoint em `MEMORIA.md` com data, decisão, evidência, riscos e próximo passo.
- Manter `MEMORIA.md` conciso: histórico detalhado, tabelas e análises pertencem a `docs/`.
- Em caso de dúvida, preferir código e testes da `main` e evidências de CI/deploy mais recentes, registrando incertezas.
- Não marcar como concluída uma tarefa com PR ainda em rascunho ou deploy não confirmado.
