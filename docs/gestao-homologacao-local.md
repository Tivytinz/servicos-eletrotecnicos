# Homologação interativa local — Eletrotécnico GO

## Objetivo e isolamento

Ambiente de desenvolvimento **exclusivamente local** com Docker Compose: PostgreSQL 16 descartável em volume separado, aplicação Next.js 16 e HTTPS local na porta 3443. Serve para treinar o funil de solicitações, orçamentos, link de aceite e OS pendente sem escrever em produção.

**Não é um ambiente Railway** e não publica site público. Docker faz bind somente em 127.0.0.1:3443. PostgreSQL não publica porta. O serviço web usa a role gestao_app e **não recebe DATABASE_URL_ADMIN**. A preparação exclusiva usa admin somente no contêiner efêmero. Nenhum arquivo de credenciais deve ser enviado a GitHub ou ao chat.

## Pré-requisitos no Windows

- Docker Desktop iniciado, com Docker Compose v2.
- PowerShell no terminal, na pasta clonada do repositório.
- Rede disponível na primeira execução para baixar imagens e dependências npm.

## Inicialização (sem tocar no Railway)

No PowerShell, na raiz do repositório:

    powershell -File scripts/homologacao-local.ps1

O script gera uma única vez o arquivo privado .env.homologacao-local com quatro segredos aleatórios de 256 bits. Reutilize esse arquivo enquanto existir o volume de dados. Não copie variáveis de produção.

Acesse no **próprio computador**:

    https://localhost:3443/gestao/login

Usuário fictício: qa-admin@example.test. Leia o valor ADMIN_PASSWORD em .env.homologacao-local para entrar. O HTTPS usa certificado autoassinado e o navegador poderá exibir aviso apenas para localhost; **nunca ignore avisos de certificado de domínios externos**.

## Roteiro manual de aceite (sempre com dados fictícios)

1. Registrar solicitação com cliente fictício, telefone fictício e descrição marcada TESTE LOCAL.
2. Qualificar solicitação e criar rascunho de orçamento com valores fictícios.
3. Registrar um envio simulado **somente neste banco local**. Não acionar contato real.
4. Em Orçamentos, gerar link privado de confirmação e abri-lo no próprio navegador. Não colocar o token em prints, mensagens ou issues.
5. Conferir versão, valor, condições e validade. Marcar a declaração e aprovar ou recusar.
6. Reabrir o link e verificar que não funciona mais. Conferir histórico e OS **apenas pendente**; nenhuma cobrança/execução.
7. Para novo cenário, cadastrar outro cliente fictício; links não podem ser reaproveitados.

## Parar ou zerar os testes

Parar sem apagar o banco:

    powershell -File scripts/homologacao-local.ps1 -Parar

Parar e **apagar permanentemente os dados de teste** do volume deste Compose:

    powershell -File scripts/homologacao-local.ps1 -Parar -ApagarDadosTeste

Isso não modifica dados do Railway. Remover o arquivo .env.homologacao-local após apagar o volume permite gerar novas senhas na próxima inicialização.

## Evidência de homologação manual — 06/11/2026

Ambiente observado pelo responsável em **Windows + Docker Desktop + Ubuntu WSL 2**, acessado pelo navegador em `https://localhost:3443` (sem uso da produção). O acesso exibiu aviso de certificado autoassinado, esperado somente para o endereço local.

Resultados da jornada supervisionada em capturas da conversa, **sem arquivar tokens, credenciais ou screenshots com dados privados no Git**:

| Verificação | Resultado |
| --- | --- |
| Docker Engine inicializado; site local e login administrativo fictício acessíveis | OK — interface observada |
| Cadastro de `Cliente QA Local`, com descrição `TESTE LOCAL` | OK — lead apareceu no painel |
| Mudança de etapa `novo` → `qualificado` | OK — auditoria confirmou mudança |
| Orçamento fictício versão 1, R$ 475,00, validade em 20/11/2026 | OK — rascunho exibido |
| Registro de envio **simulado local**, sem WhatsApp real | OK — status `enviado` |
| Geração e abertura de link privado | OK — página exibiu versão, preço e descrição |
| Confirmação por clique explícito | OK — tela `Resposta registrada` |
| Reload sem token após confirmação | OK — `Link inválido ou ausente` |
| Retorno ao painel e orçamentos | OK — `aprovado` e `Resposta via link: aprovação` |
| Criação de OS | OK — `OS pendente — não autorizada para execução` |

**Alcance da evidência:** as telas confirmam o fluxo fim a fim e a ausência de ações financeiras na interface. A atualização após refresh prova a limpeza do fragmento do navegador; **não equivale por si só a teste de replay com o segredo antigo**. Bloqueio de reutilização, concorrência e permissões foram cobertos no QA automatizado em banco isolado. Não houve medição externa de identidade/assinatura nem teste de backup/restauração de dados de produção.

**GitHub Actions da PR:** run [42271324464](https://github.com/Tivytinz/servicos-eletrotecnicos/actions/runs/42271324464) **SUCCESS**: `docker compose config --quiet`, testes, lint e build. O teste manual foi realizado com artefatos obtidos da branch e não configura deploy.

**Railway:** serviço `servicos-eletrotecnicos` publica a branch `main`, com `watchPatterns` limitadas a `/src/**`, `/public/**`, `/package.json`, `/package-lock.json`, `/next.config.ts`, `/postcss.config.mjs`, `/tsconfig.json`, `/eslint.config.mjs`. Arquivos alterados nesta PR não coincidem com o conjunto observado. Isso reduz risco de rebuild por merge, mas deve ser conferido após integração; nenhum SQL, recurso do Railway ou flag foi alterado nesta etapa.

## Limites e segurança

- Não usar conta, telefone, senha ou dados de clientes reais.
- Não fazer tunneling, ngrok, publicar portas ou subir esse Compose em servidor acessível pela internet.
- Certificados locais são autoassinados e efêmeros; o serviço não serve para clientes reais.
- A primeira compilação e o banco consomem CPU, RAM e armazenamento do computador, não recursos pagos de hospedagem.
- Este fluxo permite avaliar interface e jornada completa; **não é backup da produção** nem comprova identidade civil pelo link.
- O recurso de aceite não libera pagamento, agendamento ou OS executável.
- Checklist automático oficial continua no workflow QA Convites — navegador HTTPS.
- Antes de integrar a PR, aguardar CI e inspecionar se a inicialização funciona em um Docker Desktop real; nenhum teste de Docker local foi executado dentro desta conversa.
