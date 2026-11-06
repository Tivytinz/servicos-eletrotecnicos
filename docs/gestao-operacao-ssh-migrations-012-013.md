# Procedimento 012/013 por Railway SSH — Windows / PowerShell

**Escopo atual:** inventário SQL **somente leitura**, sem executar migrations neste procedimento. O responsável decidiu adiar backups por custo, ciente do risco de perda irreversível; nenhum recurso pago, exposição TCP pública, backup ou alteração de produção está autorizado por este documento.

## Estado conferido no Railway em 06/11/2026

- Projeto: `upbeat-compassion` (`1f92833f-04f8-44d4-931d-3d688d674c7e`).
- Ambiente: `production`. Serviço SQL: `Postgres`; web: `servicos-eletrotecnicos`.
- Último web confirmado: commit `c0aab5b1`, `SUCCESS`; a PR #62 acrescentou somente testes/documentação e seu deploy foi marcado `SKIPPED`.
- Web e Postgres online; **sem TCP Proxy público**. O Railway CLI pode abrir SSH para o serviço privado; não criar proxy público.
- As flags `GESTAO_ORCAMENTOS_REVISAO_HABILITADA` e `GESTAO_ORCAMENTOS_EVENTOS_HABILITADOS` estavam ausentes. **Não ativar** antes de confirmar o estado SQL.
- **Não houve execução nem leitura direta do PostgreSQL de produção por este agente.** O status do banco precisa ser conferido pelo operador.

## Preparação local (PowerShell)

Requer acesso de responsável ao Railway e ao repositório privado, `git`, `npm`/Node.js e OpenSSH instalados no Windows. Para instalar o CLI do Railway, conforme documentação oficial:

```powershell
npm i -g @railway/cli
railway login
railway whoami
git clone https://github.com/Tivytinz/servicos-eletrotecnicos.git
cd servicos-eletrotecnicos
git switch main
git pull --ff-only
```

Se já tiver o projeto clonado, **não repetir** `git clone`: abra a pasta correspondente no PowerShell. Não cole senhas/tokens aqui. O primeiro `railway ssh` pode solicitar o registro de uma chave SSH local.

## 1. Diagnóstico somente leitura

Executar a partir da raiz do repositório, com o PowerShell:

```powershell
$projectId = "1f92833f-04f8-44d4-931d-3d688d674c7e"
Get-Content -Raw -Encoding UTF8 ".\db\operacoes\gestao-preflight-012-013-somente-leitura.sql" |
  railway ssh --project $projectId --service Postgres --environment production -- psql -X -v ON_ERROR_STOP=1 -U postgres -d railway -f -
if ($LASTEXITCODE -ne 0) { throw "BLOQUEIO: inventário SQL não concluído; não executar migrations" }
```

Este comando **não grava dados**: utiliza `BEGIN TRANSACTION READ ONLY` e `ROLLBACK`, só lê contexto, histórico de migrations, checksums, roles e presença dos objetos 012/013. **Nunca** executar o diagnóstico com credenciais do serviço web nem alterar senhas/roles.

Se o Railway não permitir SSH/psql (falha de autenticação, política de acesso, CLI incompatível), **parar** e investigar; não abrir porta pública nem contornar restrições.

## 2. Interpretar o resultado

| Número de migrations | Próximo passo |
| --- | --- |
| 11 | Verificar `004` e `011` com status `INTEGRA`, roles `gestao_app` e `gestao_convites` presentes, dono do schema = `postgres`, então **avaliar autorização separada** de 012. |
| 12 | Confirmar `012 INTEGRA` e objetos 012 presentes; **avaliar autorização separada** de 013. |
| 13 | Confirmar `012` e `013 INTEGRA`; não reaplicar. Avaliar grants/flags e fluxo funcional antes de habilitar. |
| Outro número, `DIVERGENTE`, falha ou objetos contraditórios | **Parar.** Reconciliar a divergência em diagnóstico específico antes de aplicar. |

Para qualquer número, `banco` deve ser `railway`, `papel_sql` e `proprietario_schema` devem ser `postgres`, `somente_replica=false`, e roles não podem ter privilégios globais elevados.

## 3. Execução futura — requer autorização específica, NÃO rodar agora

As migrations completas estão em `db/operacoes/gestao-orcamentos-012-atomico.sql` e `db/operacoes/gestao-orcamentos-013-atomico.sql`. São transacionais, usam `lock_timeout`, `statement_timeout`, preflight, hashes e postflight. **Não executar estes arquivos apenas porque o inventário passou.**

Depois de uma autorização operacional específica e avaliação do risco aceito (sem backup), o operador poderá usar o mesmo túnel SSH para transmitir **o arquivo completo** ao `psql -X -v ON_ERROR_STOP=1 -f -`, aplicando **012 primeiro** e **013 em comando separado**. Verificar 12/12 depois da 012 e 13/13 depois da 013. Qualquer divergência interrompe o fluxo; não forçar SQL, editar o checksum ou repetir parcialmente.

A ativação das flags do Railway é uma terceira etapa separada, posterior à aplicação e verificação SQL. Não ativar nenhuma flag por iniciativa do diagnóstico.

## Segurança operacional

- O volume persistente do Postgres não é backup; adiar backup significa aceitar risco real de perda de dados, **não** garantir recuperação.
- O `railway ssh` usa autenticação do operador por SSH e não exige criar TCP Proxy público nem guardar URL de banco no GitHub.
- Não compartilhar tokens, cookies, senha do banco, saída de `railway variables` nem dados pessoais. A saída do inventário só contém metadados técnicos.
- Se surgir erro, guardar apenas o trecho técnico não sensível; interromper antes de executar qualquer SQL adicional.
