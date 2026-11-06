# Gestão — executor manual de migrations por GitHub Actions + Railway SSH

**Status:** implementação e testes na PR; **não configurado para acesso ao PostgreSQL de produção**. O workflow novo **não é executado em push, PR ou deploy**. A operação usa os pacotes SQL transacionais existentes, não o executor genérico `gestao-migrate.mjs --apply` (que aplicaria várias pendências de uma vez).

## Por que esta solução?

O projeto já possui `scripts/gestao-migrate.mjs`, usado no CI com PostgreSQL descartável, e o responsável solicitou um mecanismo análogo ao do Agenda Fashion sem ter de usar PowerShell para cada nova migration. O conector Railway do ChatGPT atualmente não executa SQL/SSH diretamente. O novo workflow `Gestão — migrations de produção (manual)` permite **ao responsável** disparar uma verificação ou aplicar uma única release na interface do GitHub, depois da preparação inicial.

**Estado de produção comprovado pelo responsável em 06/11/2026:** banco `railway`, papel `postgres`, **11** migrations registradas, 004 e 011 com checksums íntegros, papéis `gestao_app` e `gestao_convites` presentes e restritos, objetos 012/013 ausentes. Essas evidências são capturas da saída de inventário somente leitura, não evidência de execução 012/013.

**Decisão vigente:** não contratar nem configurar backup de produção por custo; há risco de perda irreversível. As transações e validações reduzem riscos, mas não restauram dados perdidos. A escolha não concede autorização automática para migrar. O workflow requer seleção `aplicar`, release específica e confirmação explícita.

## Arquitetura e segurança

- Workflow: `.github/workflows/gestao-migrations-production-manual.yml`; exige `workflow_dispatch` em `main`, `permissions: contents: read` e grupo de concorrência serial.
- Ambiente de segurança GitHub: **`gestao-db-production`**. Configurar **Required reviewers** e, se disponível, restringir a implantação à branch `main` **antes de fornecer qualquer segredo**. Se os controles de revisão não estiverem disponíveis, avaliar o risco e não habilitar aplicação automática.
- Conexão: Railway CLI `railway ssh` com chave SSH **dedicada à automação** e token de **workspace**, sem TCP Proxy público nem `DATABASE_URL_ADMIN` na aplicação. O comando remoto executa `psql` dentro do container Postgres existente.
- **Cuidado:** uma chave SSH de workspace concede acesso a outros serviços do workspace; o token de workspace também possui escopo amplo. Usar credenciais exclusivas, manter o ambiente GitHub protegido e revogar acesso quando não for mais necessário. Isso **não é equivalente a um token limitado apenas a um banco**.
- O SSH usa `StrictHostKeyChecking yes` com entrada verificada de `ssh.railway.com` passada via segredo. Não há `ssh-keyscan`, aceite automático de host ou upload de chave ao repositório.
- A migration 012 só inicia se houver **11/13** versões íntegras e a confirmação exata `APLICAR_012_PRODUCAO_SEM_BACKUP`. A 013 exige **12/13** e `APLICAR_013_PRODUCAO_SEM_BACKUP`.
- Cada execução confere o SHA-256 de **todas** as migrations já aplicadas, usa o arquivo SQL integral de 012 ou 013 com `lock_timeout`, `statement_timeout`, preflight e postflight e confirma o catálogo depois. Qualquer divergência bloqueia a operação. Não ativa flags, não envia mensagens e não gera OS/financeiro.
- Um erro de comunicação **após** a execução pode deixar o resultado incerto; consultar o banco de novo, não repetir às cegas. Pacotes são transacionais, mas podem ter confirmado `COMMIT` antes de o SSH cair.

## Configuração inicial (ação do responsável, uma vez)

**Não envie tokens, chaves privadas, URL do banco ou segredos ao ChatGPT.** Não reutilize a chave SSH pessoal que já foi criada no computador.

1. No GitHub do repositório, entre em **Settings → Environments**, crie `gestao-db-production` e configure os revisores obrigatórios e restrição à `main` quando suportados pelo plano.
2. No seu PowerShell, crie uma **segunda** chave SSH dedicada à automação:
   ```powershell
   ssh-keygen -t ed25519 -f "$HOME\.ssh\gestao_ci_ed25519"
   ```
   Quando pedir a senha da chave, pressione Enter duas vezes, pois o processo não interativo precisa de chave sem passphrase; ela ficará protegida nos Secrets do GitHub. **Não substitua `id_ed25519`.**
3. Em sua conta Railway com privilégios de administrador do workspace, registre **somente a chave pública** dedicada (o cadastro não instala software nem cria serviço):
   ```powershell
   railway ssh keys add --workspace d4f1277e-194c-426d-9193-289d90f45d70 --key "$HOME\.ssh\gestao_ci_ed25519.pub" --name "eletrotecnico-gestao-github-actions"
   ```
   O cadastro pode ser negado caso você não tenha acesso de administrador ao workspace. Nesse caso, **parar**, não reutilizar a chave pessoal.
4. No Railway, crie um **API token de workspace** exclusivo para esta automação (não um project token: este não funciona com gerenciamento de chaves SSH de workspace). O token e a chave têm alcance amplo e exigem controles de acesso fortes.
5. Em **GitHub → Settings → Environments → gestao-db-production → Environment secrets**, crie exatamente estes três segredos, sem colar nenhum valor no chat:
   - `RAILWAY_GESTAO_WORKSPACE_TOKEN`: token do workspace Railway.
   - `RAILWAY_GESTAO_SSH_PRIVATE_KEY`: conteúdo **integral** do arquivo local `gestao_ci_ed25519`, não da extensão `.pub`.
   - `RAILWAY_GESTAO_KNOWN_HOSTS`: entrada do host `ssh.railway.com` no `$HOME\.ssh\known_hosts`, previamente verificada com o host autêntico Railway. Não registrar a chave de host por `ssh-keyscan` sem validar a impressão digital.

**Observação:** não há armazenamento de segredo no código, na aplicação web ou em artefatos de CI. A chave privada é escrita temporariamente na máquina descartável do GitHub Actions, com permissões restritas, e removida no final. O arquivo de configuração do runner não é compartilhado com clientes.

## Usar o workflow depois da configuração

Acesse **GitHub → Actions → Gestão — migrations de produção (manual) → Run workflow**, com branch `main`.

**Primeiro, somente verificar:** selecione `modo=verificar`, `release=012`, `confirmacao` vazia. Essa opção acessa o banco em modo leitura, valida hashes 001–011 e mostra as migrations pendentes, sem executar SQL de escrita.

**Aplicar 012 (somente com autorização para esta etapa):** escolha `modo=aplicar`, `release=012`, `confirmacao=APLICAR_012_PRODUCAO_SEM_BACKUP`. O job exige 11 versões anteriores e confirma 12/13 após `COMMIT`. Repetir a 012 será bloqueado.

**Aplicar 013:** operação separada, após validação da 012 e autorização específica: `modo=aplicar`, `release=013`, `confirmacao=APLICAR_013_PRODUCAO_SEM_BACKUP`. Confirma 13/13 após `COMMIT`.

Após cada execução, verificar as permissões `gestao_app` e `gestao_convites`; **habilitar as flags de funcionalidades em Railway é outro procedimento**, posterior à integração do código e das migrations.

## Cuidados e custos

Este fluxo reutiliza GitHub Actions e o serviço Postgres existente, **sem provisionar outro serviço, sem TCP Proxy público e sem contratar backup**. Podem existir minutos de Actions contabilizados conforme o plano GitHub, além do uso normal dos recursos atuais. Não declarar custo zero garantido.

**Não alterar os workflows de produção para executar migrations automaticamente em deploys futuros.** A proteção por revisão, a confirmação de release e a validação do histórico são controles essenciais.

## Validação do desenvolvimento

- `tests/gestao-migrations-manual-workflow.test.mjs`: modo manual exclusivo, integridade dos pacotes e checksums, sintaxe Bash, negação por parâmetros/branch e simulação offline de verificação/aplicação/duplicidade.
- `tests/gestao-orcamentos-revisao-release-db.test.mjs` e `tests/gestao-orcamentos-eventos-release-db.test.mjs`: pacotes SQL atômicos reais aplicados ao PostgreSQL descartável do CI.
- Execução real contra o Railway: **pendente da configuração de segredos e validação de SSH no GitHub**; sucesso no CI sintético não comprova esse acesso.
