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
2. Aplicar migrations `001` e `002` em sequência após revisão. Provisionar usuário SQL da aplicação com grants mínimos, sem papel de superusuário.
3. Criar usuários autorizados fora da aplicação com hashes `scrypt` e atribuir papéis por processo controlado; não publicar endpoint de criação de admin.
4. Configurar `GESTAO_HABILITADA=true` **somente após** validação de segurança, testes de integração, backups e procedimento de recuperação. Até lá, deixar ausente/false.
5. Ativar TLS em produção, validar host/origin de Server Actions, observar tentativas de login e implementar **rate limiting distribuído** por IP e conta antes de exposição pública.
6. Testar CSRF, abuso, rotação/revogação de sessão, permissões, injeção SQL, exclusão e exportação de dados (LGPD).
7. Adicionar testes de integração PostgreSQL e fluxos reais de login/lead, além de testes de unidade.
8. Atualizar política de privacidade antes de tratar dados pessoais reais.

## Limitações conhecidas e riscos

- **Não ativar ainda:** não há rate limiting, mecanismo de provisionamento seguro de usuários, monitoramento de autenticação, testes de integração nem infraestrutura configurada.
- Listagem de leads é limitada a 100 registros; paginação e filtros ainda pendentes.
- O primeiro cadastro cria um novo cliente para cada lead; deduplicação e vinculação a clientes existentes ficam para outro incremento.
- A autorização por papéis é base inicial e requer confirmação com Victor/Carlos antes de liberar acesso a dados reais.
- O banco e a sessão dependem de conexão ativa; quando desabilitado, as rotas internas devem permanecer inacessíveis.
- Nenhum deploy, migration ou criação de usuários foi realizado por este PR.
