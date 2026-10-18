# Sessões protegidas no PostgreSQL — etapa de desenvolvimento (PR #46)

**Não implantado em produção.** Esta mudança exige migração de credenciais para as contas existentes, revisão de segurança e autorização operacional.

## Vulnerabilidade do desenho anterior
A role `gestao_app` tinha `SELECT/INSERT/UPDATE` na tabela `gestao.sessoes`. Credenciais SQL comprometidas poderiam gravar uma sessão associada a qualquer administrador e a combinação com `gestao_convites` permitiria emitir convites. Bloquear somente o INSERT deixaria outro problema: ler os hashes de sessões legítimas ainda possibilitaria apresentar os hashes diretamente às funções administrativas.

## Correção preparada
- Migration **008** instala `pgcrypto`, tabela privada `gestao.verificadores_senha` com bcrypt custo 12 aplicado a SHA-256 do texto da senha (pré-hash evita truncamento em 72 bytes), e tabela privada de limites de tentativa.
- Função `gestao.emitir_sessao_segura(identificador,senha,token_hash)`: consulta o verificador privado; valida a senha e aplica limite global/individual **no banco** antes de inserir uma sessão. Retorna só um UUID de sessão, nunca um segredo.
- Função `gestao.buscar_sessao_segura(token_puro)`: verifica o SHA-256 do token internamente e devolve somente identidade e papéis, sem revelar os hashes armazenados.
- Função `gestao.revogar_sessao_segura(token_puro)`: revoga somente com a posse do token secreto original, e não com o hash lido do banco.
- `gestao_app`: nenhum `SELECT/INSERT/UPDATE/DELETE` em `gestao.sessoes` nem acesso a `gestao.verificadores_senha`; recebe apenas `EXECUTE` nas três funções.
- Login e logout no Next.js passam a invocar as funções protegidas; cookies continuam `__Host-`, `HttpOnly`, `Secure`, `SameSite=Strict`.
- Migration **009** substitui `aceitar_convite` de três por quatro argumentos, cadastrando scrypt legado e bcrypt privado **na mesma transação** antes de marcar o convite como utilizado.

## Contas existentes: migração obrigatória
Usuários existentes têm senha scrypt mas **não têm** `verificadores_senha`. Após aplicar a migration 008 e trocar o código, o login desses usuários falhará até o cadastro seguro do verificador. Isso é intencional (*fail closed*), não uma autorização para gerar senhas automaticamente.

Fluxo de migração planejado para `victor` e `admin`:
1. Confirmar as contas e verificar senhas pessoais existentes por um processo operacional isolado, com autorização explícita e sem expor senhas no chat ou logs.
2. Executar `scripts/gestao-registrar-verificador.mjs --apply` com `DATABASE_URL_ADMIN`, `ADMIN_USUARIO`, `ADMIN_PASSWORD` e `GESTAO_VERIFICADOR_CONFIRM=VALIDAR_CREDENCIAL` somente no terminal operacional seguro. O script valida a senha contra o hash scrypt existente e acrescenta o verificador bcrypt. Recusa contas inexistentes/inativas e não sobrescreve um verificador já cadastrado.
3. Confirmar que há verificador para cada conta ativa necessária antes de ativar o login novo, e testar login, logout e expiração em homologação. **Nunca** colocar `DATABASE_URL_ADMIN` no web service ou expor senhas em SQL, prints, GitHub Actions de produção ou chat.
4. Planejar o corte coordenado entre grants e código, com recuperação confirmada. Evitar implantação parcial, pois a revogação de grants desabilita o login antigo.

## Limites de segurança e riscos residuais
- Essa correção protege contra **vazamento isolado ou conjunto das credenciais SQL de aplicação**, desde que os segredos de senha e tokens originais não sejam obtidos. Nenhuma das roles SQL consegue criar uma sessão de administrador sem provar a senha ao verificador protegido, ler o hash de sessão ou alterar verificadores.
- **Não protege comprometimento completo do processo web** com captura de requisições HTTP, cookies ou senhas enquanto passam pelo servidor. Para um limite independente, é necessário serviço de autenticação isolado, autenticação multifator ou provedor especializado.
- A senha é recebida pelo PostgreSQL como parâmetro de consulta no canal privado, não deve ser colocada em logs SQL. Exigir transporte privado/TLS conforme infraestrutura e auditoria de logs.
- `gestao_convites` continua com EXECUTE de emissão/listagem/revogação, mas precisa do hash de uma sessão realmente válida; a role comum não pode mais ler nem fabricar esse hash.
- A migração é dependente de `pgcrypto` no PostgreSQL. Homologar instalação, permissões, testes negativos e rollback antes da implantação.
- Tokens e hashes de sessão legados eventualmente presentes exigem análise de revogação durante a migração. Sem verificação de confiança histórica, não considerar sessões antigas seguras.

## Validação
- `tests/gestao-sessoes-protegidas-db.test.mjs`: role SQL não lê/grava sessões, login sem senha negado, conta legada sem verificador negada, senha correta cria sessão, hash não serve como cookie e logout revoga.
- QA Playwright HTTPS usa conta `qa-admin@example.test` cadastrada e migrada **somente em PostgreSQL descartável**, depois cria o convidado e testa novo login com o bcrypt emitido na aceitação.
- Revalidar resultados do **último HEAD** da PR #46 antes de considerar a correção aprovada. **Não fazer merge nem aplicar migrations em produção nesta etapa.**
