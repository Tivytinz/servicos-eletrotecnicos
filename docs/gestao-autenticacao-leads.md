# Gestão — autenticação e cadastro de leads

**Status:** implementação inicial em PR; não ativada nem validada em ambiente real.

## Entregas

- Migration `002_gestao_sessoes.sql` para sessões persistentes com hash SHA-256 do token aleatório (token bruto só em cookie).
- Hash de senha `scrypt` com salt aleatório e comparação constante; exige senha de pelo menos 12 caracteres.
- Cookie `__Host-eg_sessao`: `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, 8h.
- Autorização por papel no servidor: admin, comercial, técnico. Atribuição de papéis depende de configuração controlada.
- Login e logout; painel interno e cadastro/listagem de solicitações. Rota só funciona com `GESTAO_HABILITADA=true`.
- Consultas parametrizadas e validação server-side. Não há autoinscrição pública.
- A aplicação não registra cliques como leads automaticamente; cadastro é manual e a origem é informada.

## Pré-requisitos obrigatórios para ativação

1. Banco PostgreSQL **privado** de homologação; `DATABASE_URL` exclusivamente no ambiente de servidor. Não inserir segredo no GitHub.
2. Aplicar migrations `001`, `002` e `003` em sequência após revisão. Provisionar usuário SQL da aplicação com grants mínimos via `db/grants/gestao-app.sql`, sem papel de superusuário.
3. Criar administrador inicial com `scripts/gestao-bootstrap-admin.mjs`, usando `DATABASE_URL_ADMIN` de proprietário do schema e credenciais passadas por ambiente seguro; não publicar endpoint de criação de admin.
4. Configurar `GESTAO_HABILITADA=true` **somente após** validação de segurança, testes de integração, backups e procedimento de recuperação. Até lá, deixar ausente/false.
5. Ativar TLS em produção, validar host/origin de Server Actions, observar tentativas de login e implementar **limite por IP/WAF na borda** além do limite por conta já implementado antes de exposição pública.
6. Testar CSRF, abuso, rotação/revogação de sessão, permissões, injeção SQL, exclusão e exportação de dados (LGPD).
7. CI com PostgreSQL descartável valida migrations e consultas básicas; ainda faltam testes reais ponta a ponta de login/lead e testes de isolamento/negação por perfil.
8. Atualizar política de privacidade antes de tratar dados pessoais reais.

## Limitações conhecidas e riscos

- **Não ativar ainda:** há limite distribuído por e-mail (5 tentativas em 15 minutos), mas ainda faltam proteção por IP/WAF na borda, monitoramento de autenticação, testes de integração ponta a ponta e infraestrutura configurada.
- Listagem de leads é limitada a 100 registros; paginação e filtros ainda pendentes.
- O primeiro cadastro cria um novo cliente para cada lead; deduplicação e vinculação a clientes existentes ficam para outro incremento.
- A autorização por papéis é base inicial e requer confirmação com Victor/Carlos antes de liberar acesso a dados reais.
- O banco e a sessão dependem de conexão ativa; quando desabilitado, as rotas internas devem permanecer inacessíveis.
- Nenhum deploy, migration ou criação de usuários foi realizado por este PR.

## Dependências e CI

O `package.json` e o `package-lock.json` incluem `pg` e `@types/pg`. O workflow `Check` roda `npm ci`, auditoria de dependências, PostgreSQL 16 descartável, migrations 001–003, testes, lint e build. A verificação só é considerada aprovada depois de um workflow concluído com sucesso para o commit atual.

**Railway:** o projeto `upbeat-compassion` tem serviço `servicos-eletrotecnicos` no ambiente de produção, mas **não possui PostgreSQL próprio**. Não usar os bancos do Agenda Fashion nem criar banco de produção sem aprovar custos, backups e isolamento. Nenhum serviço ou variável foi alterado no Railway.
