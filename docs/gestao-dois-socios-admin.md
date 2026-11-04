# Acesso dos sócios — Victor e Carlos

**Decisão confirmada em 17/10/2026:** Victor e Carlos terão **contas individuais** com papel `admin` no sistema de gestão do Eletrotécnico GO, compatível com a participação societária 50/50. A responsabilidade operacional difere; o nível de acesso administrativo será o mesmo.

| Sócio | Papel aprovado | Foco operacional |
| --- | --- | --- |
| Victor | `admin` | Comercial, marketing, controle financeiro e gestão do negócio |
| Carlos | `admin` | Execução, operações e acompanhamento financeiro |

## Antes de qualquer alteração em produção

1. Confirmar estado do serviço e da flag `GESTAO_HABILITADA` no Railway; **não ativar** como parte deste procedimento.
2. Verificar, com acesso administrativo privado ao PostgreSQL, quais identificadores existem e seus papéis. Não exibir hashes nem informações de sessão. Consulta de referência:
   ```sql
   SELECT u.usuario, u.ativo, COALESCE(array_agg(up.papel_codigo) FILTER (WHERE up.papel_codigo IS NOT NULL), ARRAY[]::text[]) AS papeis
   FROM gestao.usuarios u
   LEFT JOIN gestao.usuarios_papeis up ON up.usuario_id = u.id
   GROUP BY u.id, u.usuario, u.ativo
   ORDER BY u.usuario;
   ```
3. Identificar com o responsável qual conta inicial pertence a qual sócio. **Não presumir que a conta `admin` pertence a Victor ou Carlos.**
4. Planejar provisionamento ou ajuste por usuário, com credenciais independentes, senha forte inserida em terminal privado e nenhuma senha ou hash registrada no GitHub/chat.
5. Utilizar transações, operação idempotente controlada e plano de reversão; verificar grants e migrações. Nunca fornecer ao serviço web credenciais de superusuário.
6. Testar login, logout e controle de acesso individual antes da abertura do painel. Recomenda-se trilha de auditoria por usuário e revisão de sessões.
7. Não executar escritas no banco de produção sem autorização específica para a operação exata e sem plano de reversão.
8. Backup pago segue adiado por decisão do responsável; registrar explicitamente o risco de ausência de restauração testada antes de armazenar dados reais.

## Estado

- Atribuição de papéis **aprovada como requisito funcional**.
- **Não está confirmada** a existência de duas contas nominativas nem sua configuração no PostgreSQL.
- A implementação e/ou atualização de contas em produção **não foi executada** por esta PR.
- A PR #45 prepara memória e testes de integração DB; testes E2E das Server Actions continuam pendentes.
