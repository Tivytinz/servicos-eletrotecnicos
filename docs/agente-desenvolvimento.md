# ⚡ Desenvolvimento — memória do agente

**Projeto:** Eletrotécnico GO  
**Atualizado:** 17/10/2026  
**Escopo:** desenvolvimento, segurança, testes, banco de dados, CI/CD, infraestrutura e evolução do painel interno.

## Identidade e fontes de verdade

- Repositório: `Tivytinz/servicos-eletrotecnicos`, branch principal `main`.
- Ler primeiro `AGENTS.md`, `MEMORIA.md`, o código e as PRs recentes.
- Essa memória complementa os documentos existentes; em divergências, prevalecem código atual, CI e evidências verificadas em produção.
- Manter contexto entre sessões por meio de checkpoints no repositório, não presumir que a conversa anterior esteja disponível.

## Produto e arquitetura

- Eletrotécnico GO oferece serviços elétricos e limpeza de placas solares na região de Goiânia.
- Site público em Next.js/TypeScript, hospedado no Railway; conversão principal por WhatsApp.
- Painel interno em `/gestao`, com PostgreSQL, autenticação por usuário/senha, sessões e RBAC.
- Os papéis são `admin`, `comercial`, `tecnico`. As permissões para módulos futuros **não significam que esses módulos estejam prontos**.

## Regras inegociáveis

1. Auditar estado atual da `main`, PRs, CI e implantação antes de alterar código.
2. Usar branch e PR para cada evolução; testar antes do merge, salvo autorização explícita.
3. Nunca habilitar `GESTAO_HABILITADA` sem autorização expressa.
4. Nunca executar testes com escrita, migrations ou limpeza no PostgreSQL de produção sem autorização específica. Testes usam banco descartável, credenciais isoladas e rollback.
5. Nenhum segredo, token, cookie de sessão ou dado pessoal real nos logs, commits ou documentação.
6. Autorizações devem ocorrer **no servidor**; ocultar botões não substitui controle de acesso.
7. Respeitar LGPD, princípio do menor privilégio, SQL parametrizado e tratamento seguro de sessão.
8. Não contratar backup, adicionar custo de infraestrutura ou alterar configurações pagas sem aprovação. Persistência de dados não é backup.
9. Sempre informar separadamente: implementado, testado, CI aprovado, integrado e implantado.

## Checkpoint RBAC (17/10/2026)

- **PR #44** integrada à `main` em 17/10/2026, commit `2a5a597`: auditoria RBAC e checkpoint.
- Ação real `cadastrarLead` em `src/app/gestao/leads/actions.ts` exige `leads:criar` no servidor antes de gravar.
- `src/lib/gestao/acesso.ts` verifica sessão no PostgreSQL; a matriz está em `src/lib/gestao/permissoes.ts`.
- CI `.github/workflows/check.yml` já provisiona PostgreSQL temporário, migrations e role restrita.
- Testes de matriz de permissões e sessão em DB existem. **Ainda não há evidência de teste E2E/Server Action real com perfis e garantia de ausência de gravação**.
- A flag do painel e o estado do deploy precisam ser verificados no Railway, sem assumir que estão ativos.


- PR #45 adiciona teste de integração PostgreSQL sessão/RBAC com rollback (`tests/gestao-rbac-integracao-db.test.mjs`); não substitui E2E da Server Action, nem valida CSRF/HTTP. CI pendente de confirmação.

## Próxima tarefa técnica

Implementar e validar testes de integração que executem o comportamento real de `cadastrarLead`, com PostgreSQL descartável e sessões `admin`, `comercial`, `tecnico`, anônima, revogada e expirada. Confirmar sucesso apenas para perfis autorizados, rejeição para os demais e zero gravações quando negados. Cobrir listagem de leads por permissão e proteção de origem/CSRF sem confundir teste estático com HTTP E2E. Não mudar a lógica produtiva só para facilitar mocks.

## Padrão de entrega

- Atualizar testes, documentação específica e `MEMORIA.md` na mesma PR.
- Executar `npm run check`, confirmar resultado do GitHub Actions e só afirmar deploy após inspeção no Railway.
- Documentar resultados, riscos residuais e o próximo passo; não declarar o RBAC definitivamente seguro apenas por auditoria estática.
