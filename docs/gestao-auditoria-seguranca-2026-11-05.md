# Auditoria operacional — gestão do Eletrotécnico GO (05/11/2026)

**Escopo:** código da `main` `509e5fdb`, execução no Railway e informações obtidas em capturas do PostgreSQL e da tela de convites fornecidas pelo responsável. **Não foram lidos hashes, senhas, tokens ou registros de clientes reais**. Este relatório separa evidência direta de itens ainda não confirmados no banco de produção.

## Situação comprovada

- Railway web e Postgres estão **online** e sem alertas no conector.
- Migrations 001–009: transação SQL com `COMMIT` e validação posterior: 9/9, `pgcrypto` instalada, tabela de convites/verificadores presente, `gestao_app` sem SELECT direto em `gestao.usuarios` e com EXECUTE no aceite.
- Testes manuais reportados: conexões `gestao_app` e `gestao_convites` funcionaram e as permissões restritas foram validadas por SELECT; não há acesso administrativo direto de convites pela role comum.
- Tela de produção: `victor` com perfil admin e convite inicial **utilizado**; `carlos` com perfil admin e convite **pendente**. O login genérico `admin` existia ativo com hash scrypt legado, e nenhuma senha pessoal foi cadastrada para ele.
- Funcionamento esperado: aceitar convite cria verificador bcrypt privado, não expõe hash à role SQL web; login protegido por função SQL, sessão de 8h, cookie Secure, HttpOnly, SameSite=strict, restrição por papel e origem nas ações sensíveis.

## Riscos e pendências

### Prioridade alta — conta genérica `admin`

A conta `admin` foi inicialmente criada para provisionamento. Uma conta administrativa compartilhada e permanentemente ativa é desnecessária após Victor e Carlos ativarem acessos nominais. Pelo código, o login seguro usa exclusivamente `gestao.verificadores_senha`; um hash scrypt legado sozinho **não permite** autenticação normal. Porém, a linha de conta e seu papel administrativo permanecem até desativação. **Não excluir a conta nem tentar reutilizá-la para Carlos**, pois pode haver chaves estrangeiras históricas.

**Ação preparada, não executada:** consultar `db/operacoes/gestao-admin-generico-auditoria.sql` (só SELECT); depois de Carlos aceitar o convite e ambos entrarem no painel, executar **somente mediante autorização operacional separada** `db/operacoes/gestao-admin-generico-desativar.sql` como DBA. Esse script verifica a presença de duas contas individuais ativas e administradoras com verificadores, o consumo do convite de Carlos, a ausência de verificador da conta genérica e de convite genérico pendente; então marca `admin.ativo=false`, revoga suas sessões e registra auditoria, **sem apagar IDs nem alterar dados históricos**. Falhas abortam a transação.

### Prioridade alta — segredos expostos

O primeiro link de convite do Carlos apareceu em captura compartilhada nesta conversa; enquanto permanecer **pendente**, a medida prudente é **revogá-lo e emitir outro** para envio privado ao destinatário verificado. A captura atual mostra Carlos pendente: não assumir que ele já tem acesso.

A credencial da role `gestao_convites` foi gerada e divulgada no chat. O responsável optou explicitamente por mantê-la. O risco residual permanece: apesar do isolamento da rede e de permissões limitadas, **é recomendada a rotação em canal privado**, atualizando simultaneamente a variável `DATABASE_URL_CONVITES`; não publicar credenciais em PRs, scripts, prints ou logs.

### Prioridade alta — ausência de backup

O responsável autorizou operar sem cópia recuperável. Um `COMMIT` e um volume persistente não garantem recuperação após erro, corrupção ou perda de dados. Evitar novas alterações destrutivas até existir uma estratégia de recuperação adequada.

### Prioridade média — autenticação e operação

- O código limita tentativas por login e globalmente, com contadores no PostgreSQL. Um agente mal-intencionado pode esgotar o limite global e provocar bloqueio temporário de usuários legítimos. Avaliar rate limit de borda sem abrir exceções indevidas.
- Não há evidência de MFA/2FA obrigatória neste fluxo; é uma melhoria recomendada, especialmente para administradores.
- O painel **implementa** gestão de solicitações e clientes, convites e autenticação; módulos completos de orçamento, ordem de serviço e financeiro **não** estão disponíveis na interface apesar das tabelas/schema iniciais. Não confundir esqueleto de banco com funcionalidades prontas.
- A confirmação de ativação e a preservação de sessões RBAC de Carlos devem ser verificadas na interface e em consulta agregada após o aceite. Não enviar a senha dele ao operador.
- Manter revisão periódica de sessão ativa, convites expirados, permissões SQL e registro de auditoria.

## Consulta de validação sem credenciais

Abrir o Postgres > Database > Query e executar apenas `db/operacoes/gestao-admin-generico-auditoria.sql`. O resultado informa se Victor, Carlos e admin possuem conta, estão ativos, têm papel admin e verificador de senha, e quantos convites/sessões existem, sem expor nomes completos, hashes ou links.

**Critério para a desativação:** `victor` e `carlos` ativos, administradores e com `senha_pessoal_ativada=true`; `carlos` ativado por convite; `admin` ainda ativo, sem verificador e sem convite próprio pendente. Além disso, testar login real de Carlos e de Victor em sessões privadas antes de qualquer escrita.

## Resultado desta rodada

Auditoria do código e procedimento de desativação **preparados com teste em banco descartável**; a desativação permanece **pendente** até o aceite do convite de Carlos. Nenhuma alteração em contas, sessões ou dados de produção é autorizada por este documento.
