# Gestão — autenticação, permissões e solicitações

**Estado em 17/10/2026:** implantação inicial realizada no Railway de produção; painel usado somente em testes e mantido desativado por `GESTAO_HABILITADA=false` segundo a operação. A consulta de variáveis do Railway oculta seus valores: confirmar a flag no painel antes de qualquer reativação.

## Infraestrutura e operações já realizadas

- PostgreSQL próprio no projeto Railway `upbeat-compassion`, ambiente `production`, com volume persistente. **Volume não equivale a backup.**
- Migrations `001`–`004` aplicadas manualmente em produção; login `admin` criado e validado sem publicar senha.
- `DATABASE_URL` da aplicação usa usuário restrito `gestao_app`; conexão administrativa não deve estar disponível no serviço web.
- Login, logout, redirecionamento sem sessão e criação de solicitação fictícia foram testados manualmente. Há um cadastro `Cliente Teste` no banco de produção que deve ser removido de forma controlada.
- PR #37 corrigiu apresentação de acesso negado e ocultou consentimento de marketing na área de gestão; verificações CI e QA passaram.
- Este incremento separa interface de **leitura** de leads da permissão **criar**. A Server Action já verifica `leads:criar` no servidor.

## Modelo de acesso atual

| Papel | Ler solicitações | Cadastrar solicitações | Gerir OS | Financeiro |
| --- | --- | --- | --- | --- |
| admin | Sim | Sim | Sim | Sim |
| comercial | Sim | Sim | Não | Não |
| tecnico | Sim | Não | Sim | Não |

As permissões `os:gerir` e `financeiro:gerir` estão modeladas, mas não significam que os respectivos módulos estejam implementados. As verificações devem ser feitas no servidor para **toda** operação, mesmo quando um botão não aparece.

## Controles implementados

- Sessões persistentes com hash SHA-256 de token aleatório; cookie `__Host-eg_sessao` `Secure`, `HttpOnly`, `SameSite=Strict`, 8 horas.
- Senhas com scrypt e salt aleatório; consultas SQL parametrizadas.
- Usuários inativos e sessões revogadas/expiradas não passam na consulta de autenticação.
- Controle de tentativas de login por **identificador** (5/15 min) e **limite global** (300/15 min), compartilhados no PostgreSQL. O contador global é uma proteção provisória contra pulverização de identificadores, sem depender de cabeçalhos de IP.
- Validação de Origin/Host no login; Next.js também aplica proteções próprias para Server Actions.
- Sem autoinscrição pública; criação do primeiro administrador realizada via operação controlada.

## Pendências de segurança e operação

1. **Proteção contra abuso:** limite global reduz pulverização de identificadores, mas pode ser esgotado por um atacante e impedir logins legítimos por até 15 minutos. Limite por identificador também permite bloqueio intencional de uma conta. São defesas provisórias, **não equivalem a WAF nem proteção por IP confiável**. Planejar mitigação na borda quando for possível, sem confiar cegamente em `X-Forwarded-For`. Monitorar bloqueios e rever o teto global com dados de tráfego legítimo.
2. **Testes de integração/E2E:** login, revogação, expiração, CSRF, autorização por perfil em páginas e Server Actions, entradas malformadas e injeção SQL, com banco descartável e usuários de teste.
3. **Recuperação:** operador optou por **não contratar backup pago agora**. Não há restauração testada; registrar e aceitar explicitamente risco de perda de dados antes de armazenar dados reais importantes. Persistência do volume não elimina esse risco.
4. **Privacidade/LGPD:** política de privacidade e procedimento de retenção, exclusão e exportação de dados antes de uso real.
5. **Operação:** remover com verificação o cadastro fictício, validar grants mínimos, revisar monitoramento e alertas de autenticação, e paginar listagem de 100 leads.
6. **Integridade de migrations:** antes da próxima migration, comparar o SHA-256 real do arquivo `db/migrations/004_gestao_usuario_login.sql` com o checksum registrado em `gestao.schema_migrations`. Não alterar o histórico sem conferência.
7. **Ativação:** manter `GESTAO_HABILITADA=false` até revisão de risco e testes adequados. A confirmação visual da flag no Railway cabe ao operador.

## Validação técnica

`npm run check` executa lint, testes e build. O workflow CI utiliza PostgreSQL descartável para os testes de integração disponíveis; isso **não** substitui testes reais de autorização entre perfis nem validação de restauração.

Nenhuma migração, modificação de usuários ou alteração de dados de produção deve ocorrer como efeito deste documento.
