# Convites de usuários — implementação fase 1

## Requisito

Somente administradores autorizados poderão emitir convite para `admin`, `comercial` ou `tecnico`. Carlos será o primeiro convidado, definindo a própria senha. Convites futuros para funcionários usarão o mesmo fluxo.

## Entregue nesta PR

- Migration `005_gestao_convites.sql`: token **somente como SHA-256**, usuário, papel, responsável, data de expiração, revogação e consumo único.
- Gerador criptográfico de token (32 bytes), hash, validação de identificador e predicado de expiração.
- Testes unitários para token, identificação e condições de uso.
- Nenhum envio externo nem cadastro de usuários é executado por esta fundação.

## Pendências indispensáveis antes de ativar

1. Implementar emissão no backend com autorização `admin` verificada no servidor e auditoria.
2. Implementar resgate transacional com `SELECT ... FOR UPDATE` e inserção de usuário + papel + marcação de consumo na mesma transação; negar token vencido/usado/revogado e login já existente.
3. Definir estratégia restrita de acesso SQL para o serviço web sem permitir que funções públicas alterem papéis. Nunca usar `DATABASE_URL_ADMIN` no serviço web.
4. Criar UI administrativa de convite e UI pública de definição de senha com controles anti-abuso/CSRF, HTTPS, headers anti-cache e ausência de tracking.
5. Evitar token em logs, analytics e referers; expiração recomendada de 24 horas, uso único e revogação.
6. Testar concorrência de aceite (somente 1 sucesso), perfis, revogação, expiração e ausência de gravação em banco PostgreSQL descartável.
7. Executar CI e revisão de segurança antes de aplicação da migration 005. **Nunca aplicá-la em produção automaticamente**.
8. Manter `GESTAO_HABILITADA` desativada até autorização específica. Não criar convite de Carlos antes de o fluxo estar concluído e validado.

## Status

**Fundação em desenvolvimento**. O fluxo de convites e cadastro de Carlos ainda não está utilizável em produção. A conta genérica `admin` deve permanecer temporariamente ativa; a conta `victor` foi informada como criada pelo responsável, sem inspeção direta de login.

## Etapa 2 — operações SQL preparadas

- `src/lib/gestao/convites-sql.ts` adiciona emissão autorizada pelo papel admin, aceite atômico com bloqueio de linha, atribuição de papel do próprio convite e revogação restrita a admin.
- `tests/gestao-convites-db.test.mjs` cobre emissão negada a técnico, emissão por admin, uso único e revogação no PostgreSQL descartável, revertendo registros por rollback.
- **Ainda não há API/Server Action ou frontend para utilizar esses comandos.** Não conceder novas permissões de `INSERT` em usuários/papéis à aplicação até análise de segurança e desenho de privilégios mínimos.
- Adicionar teste de concorrência em múltiplas conexões, falha por expiração e validação de origem antes de disponibilizar convites reais.

## Preparação de interface

- Interface administrativa em `/gestao/convites` criada atrás de `GESTAO_CONVITES_HABILITADOS`, mas a Server Action falha fechada até implementação da entrega segura do link. Rota pública de aceite ainda redireciona e não coleta senha. **Não habilitar a flag.**

**Bloqueadores de liberação:** concluir entrega segura do token, grants mínimos da aplicação, UI de aceite, rate limiting, CSRF e testes E2E. Não divulgar o recurso como funcional.

## Validação adicional

- Corrigido import TypeScript de `convites.ts` incompatível com o runner Node 24, identificado em CI com falha.
- Acrescentada verificação em PostgreSQL descartável de que convite expirado não pode ser aceito.
- Ainda faltam testes concorrentes com múltiplas conexões e revisão da instrução de aceite antes de habilitar a funcionalidade.
