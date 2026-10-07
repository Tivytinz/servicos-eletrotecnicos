# Plano inicial de Google Ads — Eletrotécnico GO

## Objetivo
Gerar contatos qualificados pelo WhatsApp.

## Conversão principal
Evento: `whatsapp_click`

O site já está preparado para disparar esse evento após a ativação do Google Analytics 4 e consentimento do visitante.

## Campanha 1 — Serviços elétricos
Landing page:
https://eletrotecnicogo.com.br/servicos-eletricos

Grupos de intenção:
- eletricista / eletrotécnico em Goiânia
- manutenção elétrica
- instalação elétrica
- quadro elétrico / disjuntor
- inspeção elétrica

Exemplos de palavras-chave de alta intenção:
- "eletricista goiania"
- "eletrotecnico goiania"
- "manutencao eletrica goiania"
- "instalacao eletrica goiania"
- "eletricista aparecida de goiania"
- "eletricista perto de mim"

## Campanha 2 — Limpeza de placas solares
Landing page:
https://eletrotecnicogo.com.br/limpeza-de-placas-solares

Grupos de intenção:
- limpeza de placas solares
- limpeza de painel solar
- manutenção / limpeza fotovoltaica

Exemplos de palavras-chave:
- "limpeza de placas solares goiania"
- "limpeza de painel solar goiania"
- "limpeza placa solar aparecida de goiania"
- "empresa limpeza placas solares"
- "limpeza sistema fotovoltaico"

## Localização
Priorizar presença física do usuário nas regiões atendidas:
- Goiânia
- Aparecida de Goiânia
- Hidrolândia
- Senador Canedo
- Trindade

Evitar expansão automática para pessoas fora da área apenas interessadas nas cidades.

## Negativas iniciais
Revisar antes de publicar:
- curso
- vaga
- emprego
- salário
- apostila
- pdf
- grátis
- como fazer
- faça você mesmo
- material
- atacado
- placa solar preço
- comprar placa solar

## Mensagens dos anúncios
Foco em:
- atendimento local
- orçamento pelo WhatsApp
- residências e comércios
- fotos reais nos serviços de limpeza solar
- cidades atendidas

Evitar promessas de economia, aumento percentual de geração ou garantias que não possam ser comprovadas.

## UTMs sugeridas
Modelo:
`?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}`

## Antes de ativar investimento
1. Domínio e HTTPS estáveis.
2. GA4 instalado.
3. Evento `whatsapp_click` validado.
4. Google Search Console verificado.
5. Política de Privacidade acessível.
6. Perfil da Empresa no Google criado/revisado.
7. Orçamento diário e raio/cidades aprovados.

## Estado atual — campanha publicada (07/10/2026)

### Campanha
- Nome: **Pesquisa | Serviços Elétricos | Goiânia**
- Tipo: **Pesquisa**
- Orçamento diário: **R$ 20,00/dia**
- Landing page: `https://eletrotecnicogo.com.br/servicos-eletricos`
- Status observado na configuração inicial: **Ativada**, com anúncio ainda **Pendente / Em análise**
- Estratégia inicial de lances: **Maximizar cliques**
- Limite máximo de CPC: **não definido**
- Diretriz: manter Maximizar cliques enquanto a campanha ainda não possui volume confiável de conversões; reavaliar **Maximizar conversões** depois de acumular leads reais.

### Conversão usada pela campanha
- Nome visível no Google Ads: **Lead - WhatsApp**
- Categoria/meta: **Contato**
- Otimização: **Principal**
- Origem: **Site (Google Analytics 4)**
- Propriedade GA4: **Eletrotécnico GO**
- Evento técnico: `whatsapp_click`
- Contagem: **Todas as conversões**
- Janela de conversão de clique: **90 dias**
- Janela de visualização engajada: **3 dias**
- Atribuição: **baseada em dados**
- Estado inicial observado: **Conversões pendentes**; o Google informa que novas ações podem levar até 48 horas para começar a registrar.
- O evento foi implementado de forma centralizada no site para links de WhatsApp e envia contexto de página, CTA, destino e UTMs.
- Alteração técnica mergeada na `main` pela PR #1 em 07/10/2026.

### Segmentação geográfica
A campanha está limitada às 5 cidades atendidas:
- Goiânia
- Aparecida de Goiânia
- Hidrolândia
- Senador Canedo
- Trindade

Configuração de local:
- usar **presença** nas regiões segmentadas;
- evitar pessoas fora da área que apenas demonstraram interesse nas cidades.

### Palavras-chave ativas observadas
Estratégia inicial: priorizar **correspondência exata** e **de frase**, sem correspondência ampla nesta fase.

Exemplos já configurados:
- `[eletricista goiania]`
- `"eletricista goiania"`
- `[eletricista aparecida de goiania]`
- `"eletricista aparecida de goiania"`
- `"eletricista residencial goiania"`
- `"eletricista perto de mim"`
- `"manutenção elétrica goiania"`
- `"eletricista comercial goiania"`

Observação:
- alguns termos podem aparecer como **Baixo volume de pesquisas**; não excluir apenas por isso durante a fase inicial.

### Palavras-chave negativas já adicionadas
No nível da campanha, em correspondência ampla:
- curso
- cursos
- vaga
- vagas
- emprego
- empregos
- salário
- salários
- apostila
- pdf
- grátis
- gratuito
- tutorial
- como fazer
- faça você mesmo
- aprender
- atacado
- loja
- comprar
- material elétrico

Objetivo das negativas:
- reduzir cliques de intenção educacional, emprego, compra de material ou DIY;
- concentrar o orçamento em buscas com intenção de contratação.

### Anúncio
- Formato: **Anúncio responsivo de pesquisa**
- URL final confirmada: `https://eletrotecnicogo.com.br/servicos-eletricos`
- Caminho de exibição: `servicos / eletricos` (apenas visual; não altera a URL final)
- Mensagem central: eletricista/eletrotécnico em Goiânia, manutenção elétrica, atendimento local e orçamento pelo WhatsApp.
- Estado observado em 07/10/2026: **Em análise**.
- Não editar títulos/descrições durante a análise sem necessidade, para evitar reiniciar a revisão.

### Regra operacional da campanha
Enquanto estiver no início:
1. evitar mudanças frequentes em lances, orçamento, segmentação e anúncios;
2. acompanhar termos de pesquisa e adicionar negativas conforme surgirem buscas irrelevantes;
3. validar o recebimento de `Lead - WhatsApp`;
4. somente depois de dados reais, avaliar mudança de **Maximizar cliques** para **Maximizar conversões**;
5. manter o orçamento inicial em **R$ 20/dia** até haver evidência suficiente para aumentar ou reduzir.

