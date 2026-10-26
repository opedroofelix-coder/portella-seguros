# CRM Portella: Seguros e Consórcio

Especificação dos dois sistemas de gestão de clientes (CRM) da **Portella Corretora de Seguros**:
um para **seguros** e outro, separado, para **consórcio**. Os dados iniciais vêm da planilha
de produção da corretora (`Portella_Corretora_Seguros_Dezembro.xlsx`).

Este documento reúne o que a Deliziane (administradora) definiu para o sistema, na conversa
de construção do primeiro protótipo (arquivo `crm-portella.html`), e como cada ponto está no
CRM atual. A seção 0 é a especificação de negócio; as seções seguintes descrevem o sistema.

---

## 0. Requisitos da Portella (especificação de negócio)

### 0.1 Como o negócio funciona

1. O produtor fecha o seguro e **transmite a proposta** à seguradora. A proposta gera um
   **número** e um valor a pagar, do qual sai o **prêmio líquido**.
2. Sobre o prêmio líquido incide a **comissão trabalhada** (em geral de 0% a 40%). Em planos de
   saúde ela pode passar de 100% do prêmio (ex.: 300%).
3. A seguradora paga essa comissão **à vista ou em parcelas**. Muitas vezes não se sabe quantas
   parcelas serão nem quando cairão: pode vir uma parte no mês 1, outra no mês 2, outra no 4º,
   outra no 18º. Por isso o controle é por **saldo**:
   `comissão a receber − comissão recebida = saldo a receber`, por cliente e por produtor.
   Quando a soma dos recebimentos atinge a comissão, o saldo zera e a proposta sai do "a receber".
4. Algumas seguradoras pagam **comissão vitalícia** (um % sobre o prêmio líquido que continua
   depois da comissão principal). Exemplo de saúde: 300% pago na 1ª, 4ª, 5ª ou 6ª parcela, e
   depois 2% vitalício.
5. Do que a corretora **recebe**, ela **repassa** ao produtor o % combinado (de 1% a 50%).
   Repasse = comissão recebida × % do produtor. Uma venda pode ter **mais de um produtor**, cada
   um com o seu %.
6. Todo mês a administradora paga cada produtor. O pagamento considera as comissões recebidas no
   mês, **menos estornos** (cancelamentos) e **menos vales** (adiantamentos).

### 0.2 Usuários e acesso

- **Administradora** (Deliziane): vê e faz tudo. É quem aprova propostas, dá baixa nos
  recebimentos, lança estornos e vales e paga os produtores.
- **Produtor**: um login por produtor. Vê só as próprias propostas e lança propostas novas. Não vê
  nem lança a comissão recebida da seguradora.
- **Senha inicial padrão `1234`** para todos, com **troca obrigatória no primeiro acesso**. A
  administradora pode redefinir a senha de um produtor para `1234` quando ele esquecer.
- Produtores atuais (lista da Portella, 26/10/2026): Deliziane, Marielly, Gisele Costa, Gabriel,
  Berdum, Luana, Renata, Danila e Jessica Naiane. Carla, Felippe e Silvana (planilha de
  dezembro/2024) e Cadu não fazem mais parte. A lista deve ser editável: incluir e retirar produtores.
- **% de repasse padrão por produtor**, sugerido ao lançar a proposta e editável caso a caso:
  Deliziane 40%, Danila 50%, Luana 50%, Gisele Costa 50%, Marielly 15% (o da "Mary" da conversa).

### 0.3 Fluxo de aprovação

1. O produtor lança a proposta → ela fica **"Pendente de aprovação"** e ainda não entra no
   painel, no saldo a receber nem nos relatórios.
2. Enquanto está pendente, o produtor pode editar ou excluir a própria proposta.
3. A administradora vê um **aviso** (contador no menu e faixa no painel: "Você tem X propostas
   aguardando aprovação"), revisa, corrige se preciso e **aprova**.
4. Depois de aprovada, a proposta entra no controle geral. Só a administradora edita, inclusive
   os campos de comissão, porque existem **comissões adicionais** que chegam depois.

### 0.4 Cadastro da proposta

| Campo | Observação |
|---|---|
| Nome completo do cliente (segurado) | |
| Número da proposta / apólice | |
| Data da proposta | |
| Seguradora | lista editável (abaixo) |
| Produto (ramo) | lista editável (abaixo) |
| **Tipo de negócio** | **Seguro novo** ou **Renovação da carteira** (renovação da própria corretora, não de congênere) |
| Prêmio líquido (R$) | |
| Comissão trabalhada (%) | 0% a 40% em geral; pode passar de 100% (saúde) |
| Comissão a receber (R$) | calculada: prêmio líquido × comissão trabalhada |
| Regra de recebimento | **Normal** (por saldo) ou **com vitalício depois** + **% vitalício** sobre o prêmio líquido |
| Produtores | um ou mais, cada um com o **% de repasse**; ao digitar o %, mostra na hora **"Receberá R$ X"** sobre a comissão total |
| Recebimentos (só administradora) | cada um com **data**, **valor** e **parcela em texto livre** ("1ª", "6.6", "9.12", "156") |
| Calculados | comissão recebida (soma), **saldo a receber**, quantidade de recebimentos |

**Produtos**: Automóvel, Residencial, Saúde, Vida, Dental, Consórcio, Rastreador, Assinatura
Mensal, Celular, Equipamentos Portáteis, Empresarial, Aluguel, Responsabilidade Civil,
RC Profissional e Fiança Locatícia, com a opção de incluir outros.

**Seguradoras**: Aliro, Allianz, Azos, Akad, Azul, Azul por Assinatura, Bp Seguradora, Bradesco,
Darwin, Excelsior, Ezze, GNDI, HDI, Itaú, Ituran, Justos, Justos Mensal, Liberty, Loovi, Mapfre,
Mitsui, Novo Seguros, Novo Seguros Mensal, Pier, Porto Seguro, Servopa, Sompo, Suhai, Sul América,
Tokio Marine, Yelum, Youse e Zurich, com a opção de incluir outras.

### 0.5 Estornos e vales

- **Estorno**: nome do segurado, nº da apólice, seguradora, produto, produtor, data e valor.
  Desconta do pagamento do produtor no mês.
- **Vale**: produtor, data, valor e motivo. Desconta do pagamento do mês.

### 0.6 Relatórios

- **Pagamento mensal por produtor**: comissões recebidas no mês (pela data de cada
  recebimento) × % do produtor, **menos estornos, menos vales = líquido a pagar**. Exportar em
  **PDF** e em planilha para enviar ao produtor. (A conversa pediu XML; o protótipo usou Excel,
  `.xlsx`, que abre direto no computador.)
- **Comissões pendentes / futuras por produtor**: tudo o que ainda tem saldo a receber da
  seguradora e quanto disso será repassado a cada produtor, para controlar o que está em aberto.

### 0.7 Painel (dashboard)

Com filtro de período, em **valores em R$**:
- Produção geral (prêmio líquido emitido).
- Prêmio líquido **por produtor**.
- Prêmio líquido **Seguro novo × Renovação da carteira** (valor e quantidade).
- Prêmio líquido **por produto** e **por seguradora**, em tabela com os valores exatos.
- Comissão recebida geral e comissão repassada aos produtores.
- **Comissão pendente por produtor**: saldo a receber e repasse projetado (sem filtro de período).
- **Crescimento mês a mês** (variação sobre o mês anterior e sobre o mesmo mês do ano anterior)
  e **ano a ano**.

Decisão a validar: a produção por produtor conta o prêmio **cheio** da proposta para cada
produtor envolvido (ranking de vendas), e não o prêmio dividido pelo % de cada um.

### 0.8 Fora do escopo por enquanto

- Empréstimo do Gabriel e Poupança Portella (abas da planilha). Observação: o CRM atual importa a
  Poupança no Financeiro; dá para retirar se não for desejado.
- Desconto de imposto combinado com a Renata (acerto específico). Se precisar, usar estorno como ajuste.

### 0.9 O que já existe no CRM e o que falta

| Requisito | Situação no CRM |
|---|---|
| Login por usuário, perfis administrador e corretor (produtor) | ✔ (também há o perfil gestor) |
| Senha padrão `1234` com troca obrigatória no 1º acesso; administradora redefine para `1234` | ✔ |
| Produtores da conversa e da planilha já cadastrados, com o % padrão | ✔ no primeiro acesso (ver seção 2) |
| Produtor vê só as propostas em que participa | ✔ |
| Fluxo de aprovação, com contador no menu e aviso no painel | ✔ menu **Aprovações** |
| Proposta com tipo de negócio (novo × renovação) | ✔ |
| Comissão trabalhada (%) e comissão a receber calculada | ✔ (pode passar de 100%) |
| Recebimentos por saldo, com parcela em texto livre | ✔ saldo = comissão − recebido |
| Regra vitalício com % sobre o prêmio líquido | ✔ recebimentos depois de quitada a comissão viram vitalício |
| Vários produtores por proposta, cada um com o seu % e "Receberá R$ X" | ✔ |
| Listas editáveis de produtos e seguradoras | ✔ menu **Configurações** |
| Administradora altera o % de repasse dos produtores | ✔ **Configurações › Repasse dos produtores**, com opção de aplicar às propostas em aberto |
| Estornos (segurado, nº da apólice, seguradora, produto, produtor, valor) e vales | ✔ menu **Estornos e vales** |
| Relatório de pagamento mensal (repasse − estornos − vales) com PDF e Excel | ✔ menu **Relatórios**, com "Registrar pagamento" |
| Relatório de comissões pendentes por produtor | ✔ PDF e Excel |
| Painel: produção por produtor (proporcional ao %), novo × renovação, por produto e seguradora em R$, recebida × repassada, pendente por produtor, crescimento mês a mês e ano a ano | ✔ menu **Painel de produção** |
| Consórcio | ✔ CRM separado, com as mesmas telas de propostas e relatórios |
| Dados compartilhados entre computadores | ✘ falta: depende da escolha do backend |

## 2. Perfis de usuário

| O que pode fazer | Administrador | Gestor | Corretor |
|---|:-:|:-:|:-:|
| Cadastrar usuários, trocar perfis, desativar acessos | ✔ | – | – |
| Importar a planilha | ✔ | – | – |
| Ver a carteira inteira e o painel geral | ✔ | ✔ | só a própria |
| Cadastrar clientes, apólices, cotas e oportunidades | ✔ | ✔ | ✔ (fica na carteira dele) |
| Editar registros | ✔ | ✔ | só os próprios |
| Remover registros | ✔ | ✔ | – |
| Transferir registros entre corretores | ✔ | ✔ | – |
| Lançar propostas | ✔ (já aprovadas) | ✔ (já aprovadas) | ✔ (ficam pendentes) |
| Aprovar propostas, dar baixa, lançar estornos, vales e pagamentos | ✔ | ✔ | – (consulta os próprios) |
| Editar listas de produtos e seguradoras | ✔ | ✔ | – |
| Financeiro da corretora | ✔ | ✔ | – |

Regras extras:
- Entra-se com **usuário** (ex.: `deliziane`), não com e-mail.
- No primeiro acesso, o sistema pede para criar o administrador e já cadastra os produtores
  Deliziane (40%), Marielly (15%), Gisele Costa (50%), Gabriel, Berdum, Luana (50%), Renata,
  Danila (50%) e Jessica Naiane, com usuário igual ao primeiro nome (ex.: `gisele`, `jessica`) e
  senha `1234`. Os % vêm da conversa com a Portella; quem está sem % recebe o padrão em
  **Usuários**. A lista se edita em Usuários (incluir, desativar).
- Usuário novo entra com a senha `1234` e, no primeiro login, só segue depois de criar a própria
  senha (mínimo de 6 caracteres, diferente de `1234`). O administrador pode **redefinir a senha para 1234**.
- O sistema sempre mantém pelo menos um administrador ativo.
- Um usuário desativado não entra mais e perde a sessão aberta.

## 3. CRM de Seguros

**Painel**
- Apólices vigentes (as "a iniciar" à parte), renovações em até 30/60/90 dias, prêmio líquido vigente
  e comissão prevista. Os indicadores levam às telas de Apólices e Renovações.
- Renovações dos próximos 30 dias (as mesmas do indicador; as vencidas ficam na fila de Renovações).
- Tabela por seguradora (prêmio líquido e quantidade, com "Outras"), gráfico por ramo e resumo do funil.
- O produtor não vê a comissão da corretora: no lugar dela aparecem as cotações em aberto.

**Clientes**
- Pessoa física ou jurídica, com validação de CPF/CNPJ, telefone/WhatsApp, e-mail, endereço e observações.
- Busca por nome, documento, telefone ou cidade.
- A ficha do cliente mostra os dados e as apólices dele, com botão para o WhatsApp.

**Apólices**
- Seguradora: uma das parceiras (as mesmas da faixa do site: Porto Seguro, Allianz, Bradesco Seguros,
  SulAmérica, Tokio Marine, HDI, Mapfre, Yelum, Azul, Suhai, Ituran, Justos, Youse e Pier, além da
  Sompo, que não faz mais automóvel e por isso não aparece no ramo Auto) ou "Outra".
- A Liberty virou Yelum: as apólices antigas guardadas como Liberty aparecem como "Yelum (antiga Liberty)",
  e a importação reconhece os dois nomes.
- Ramo: Auto, Vida, Previdência, Saúde, Residencial, Fiança Locatícia, Responsabilidade Civil, Empresarial,
  Dental, Transportes, Equipamentos portáteis (bike, celular, câmera), Pet ou Outros.
- Seguradoras fora das parceiras (GNDI, Mitsui, Akad, Aliro…) ficam pelo nome e aparecem no filtro.
- Campos: nº da apólice, bem segurado, vigência, prêmio líquido, prêmio total, comissão (%) e forma de pagamento.
- Situação calculada pela data: **a iniciar** (início no futuro, como a apólice nova de uma renovação),
  **vigente**, **a vencer** (até 30 dias), **vencida**, **renovada** (venceu, mas já foi renovada) ou
  **cancelada**. Assim a renovação não conta em dobro no Painel.
- Contratos contínuos (vida, saúde, dental…) ficam sem fim de vigência e não entram na fila de renovação:
  ao escolher um desses ramos, o formulário limpa o fim da vigência.
- A lista abre pelas vigentes e a vencer, com filtros de situação, seguradora, ramo, vigência estimada,
  renovação e produtor, colunas ordenáveis e o total de prêmio líquido e comissão.
- **Vigência estimada**: a planilha não tem o fim da vigência; nas apólices importadas de ramos anuais
  o fim é a data da proposta + 12 meses e aparece como "(estimada)" até alguém confirmar na edição
  (mudar a data já confirma). O filtro "Vigência: estimada" lista as que faltam conferir.
- Comissão prevista = prêmio líquido × comissão (%), mostrada ao digitar. Administração e gestão excluem
  apólices, com confirmação.

**Renovações**
- Fila das apólices que vencem em 15, 30, 60 ou 90 dias (e das vencidas há até 30 dias) e ainda não foram renovadas.
- Ações: chamar no WhatsApp com a mensagem pronta (marca como "em contato"), **Renovar** (cria a apólice
  nova com 12 meses de vigência e marca a anterior como renovada) e "Não renovou", que pede confirmação e
  o motivo (preço, outra corretora, vendeu o bem, sem retorno, outro). Busca e filtro de contato.

**Cotações (funil)**
- Etapas: Novo → Em contato → Proposta enviada → Fechado / Perdido (com motivo: mover para Perdido pede o
  motivo). Os produtos são os mesmos de Propostas (lista de Configurações).
- Indicadores: em aberto, propostas enviadas, fechadas e taxa de conversão.

## 4. CRM de Consórcio (sistema separado)

**Painel**: cotas ativas, contempladas, crédito em andamento, lances aguardando assembleia,
cotas por administradora e por tipo de bem.

**Cotas**
- Administradora (texto livre, com sugestão das já cadastradas), grupo, cota, tipo de bem
  (imóvel, automóvel, moto, pesados, serviços, outros), crédito, prazo, parcela, data de
  adesão e parcelas pagas.
- Situação: ativa, contemplada (com data e forma: sorteio ou lance), quitada ou cancelada.

**Lances**
- Cota, data da assembleia, tipo (livre, fixo, embutido), percentual e/ou valor.
- Resultado: aguardando, contemplado ou não contemplado. Um lance contemplado marca a
  cota como contemplada por lance.

**Propostas (funil)**: as mesmas etapas do funil de seguros.

As vendas de consórcio da planilha não têm grupo, cota nem prazo. A cota é criada com
administradora, nº da proposta, crédito e data, e aparece com o selo **Completar cadastro**
(há filtro "Cadastro: a completar" e o total no painel).

## 4.1 Propostas, aprovações, estornos, vales e relatórios (nos dois CRMs)

Substitui as abas "A Receber" e "Comissões <corretor>". Segue a seção 0.

- **Propostas**: cada venda com cliente, nº, data, seguradora, produto (listas editáveis), tipo de
  negócio, prêmio líquido, comissão trabalhada (%), comissão a receber, regra normal ou vitalício,
  produtores com o % e o "Receberá R$ X", e os **recebimentos** (data, valor, parcela em texto livre).
  Saldo a receber = comissão − recebido. Filtros por situação, produtor, tipo e saldo.
- **Aprovação**: a proposta do produtor fica **pendente**; ele pode editar ou excluir enquanto
  ela está pendente. A administradora vê o contador no menu **Aprovações** e a faixa no painel,
  revisa, lança recebimentos e aprova. Depois disso só a administração altera.
- **Repasse**: em cada recebimento, o produtor recebe o seu % (ou o valor fixo que veio da planilha).
- **Alterar os %** (administrador): em **Configurações › Repasse dos produtores**, um campo por
  produtor. O novo % é sugerido nas propostas novas. Com **Aplicar também às propostas em aberto**,
  ele passa a valer nas propostas com saldo a receber em que o produtor participa; o repasse do que
  já foi recebido fica congelado no % antigo, e propostas em que a soma dos % passaria de 100% ficam
  como estão (o aviso diz quantas). O % de uma proposta específica se altera na própria proposta.
- **Estornos e vales**: descontam do pagamento do produtor no mês da data.
- **Relatórios**: pagamento mensal por produtor (repasse dos recebimentos do mês − estornos −
  vales = líquido), com **PDF**, **Excel** e **Registrar pagamento**; fechamento do mês com todos
  os produtores; **comissões pendentes** por produtor (saldo a receber e repasse previsto).
- **Painel de produção**: por ano, mês ou todo o período (seção 0.7).
- O produtor vê só as propostas em que participa, só o próprio repasse e os próprios relatórios.

## 4.2 Financeiro (CRM de Seguros, administrador e gestor)

Substitui as abas "Bradesco", "Demonstrativo" e "Faturamento". A poupança ficou de fora, a pedido da Portella.

- **Resumo do mês**: saldo da conta corrente, entradas, saídas, despesas em aberto, saldos por
  conta, faturamento mensal e próximas despesas.
- **Extrato**: movimentos da conta (Bradesco) com saldo acumulado.
- **Despesas**: contas a pagar com vencimento, pagamento e situação (paga, em aberto, vencida). **Pagar…**
  pede a data e, se marcado, lança a saída no extrato Bradesco, para despesas e conta baterem.
- **Faturamento**: fechamento mensal (comissões recebidas e crédito de consórcio vendido), com total por ano.
  Fechar de novo um mês que já tem fechamento pede confirmação.
- A aba fica no endereço (`/financeiro?aba=extrato`) e o mês padrão nunca é um mês futuro.

## 5. Importação da planilha

```bash
cd crm
PLANILHA_SENHA='…' npm run importar --silent -- /caminho/Portella_Corretora_Seguros_Dezembro.xlsx
```

A planilha é protegida por senha. O importador a abre **só em memória**: a senha e os dados
nunca vão para o Git. Os arquivos gerados ficam em `crm/dados/` (fora do Git):
`seguros.seed.json`, `consorcio.seed.json` e `relatorio.json`. No CRM, o administrador abre
**Importar**, confere o resumo e os avisos e confirma. Reimportar o mesmo arquivo **atualiza**
os registros, sem duplicar.

Os produtores da planilha (Carla, Deliziane, Gabriel, Gisele, Silvana, Renata, Felippe) já são
cadastrados no primeiro acesso. O importador liga cada venda ao usuário de mesmo nome (ou mesmo
primeiro nome). Sem correspondência, a venda fica com quem importou e aparece um aviso.

### Como cada aba é usada (planilha de dezembro/2024)

| Aba | Vai para |
|---|---|
| A Receber | clientes, apólices/cotas e **propostas** (parcelas recebidas viram recebimentos) |
| Comissoes Carla, Deliziane, Felippe, Gabriel, Gisele, Silvana | produtores e % de cada proposta, repasse de cada recebimento, estornos e pagamentos (Comissão Paga) |
| Essencial Allianz / Renata | ignoradas: detalhamento da assessoria; os valores líquidos já estão em "A Receber" |
| Bradesco | extrato da conta corrente |
| Demonstrativo de Receitas e Despesas | despesas da empresa (receitas e repasses o CRM calcula) |
| Poupanca Portella | ignorada: a poupança não entra no CRM |
| Faturamento | faturamento mensal de 2024 e crédito de consórcio vendido |

Colunas usadas: Data Proposta, Nr. Proposta, Nome/Razão Social, Produto, Cia Seguradora,
Produtor, Parcela, Dt. Recebto., Prêmio/Prêmio Líquido, Comissão a Receber/Recebida, Comissão a
pagar Corretor, Comissão Paga (e as equivalentes da seção "Controle de Estornos").

Regras:
- Produto "Consorcio" (ou administradora Magalu) → CRM de Consórcio; o resto → CRM de Seguros.
- A mesma parcela nas abas "A Receber" e "Comissões <corretor>" é reconhecida por seguradora +
  nº da proposta + parcela. A data de recebimento não entra na comparação, porque na aba do corretor
  ela é a data do repasse.
- **Uma proposta por venda** (seguradora + nº da proposta): a comissão a receber é a soma das
  parcelas; cada parcela com valor recebido vira um **recebimento**, com o repasse de cada produtor
  em reais, exatamente como na planilha. Parcelas ainda não recebidas ficam no saldo.
- O % de cada produtor é o repasse ÷ a comissão das parcelas que já têm o repasse preenchido. Sem
  nenhum repasse na planilha, vale o % padrão do produtor em Usuários.
- Quando dois corretores recebem sobre a mesma parcela (ex.: supervisão), os dois entram como
  produtores da proposta, sem repetir o valor da seguradora.
- **Pagamentos**: a coluna "Comissão Paga" vira o pagamento do produtor no mês do recebimento
  (já descontados os estornos, como na planilha).
- Estornos sem data são ignorados, com aviso (2 da Silvana na planilha de dezembro/2024).
- Produtor "Corretora" → venda da corretora, sem produtor.
- "Endosso" e "Estorno" geram só a proposta, sem nova apólice.
- Seguradoras e produtos que não estão nas listas entram nelas na importação.
- A planilha não tem CPF, telefone nem e-mail: os clientes entram só com o nome e os demais dados
  são completados no CRM.

### Conferência com os totais da planilha

| Item | CRM | Planilha |
|---|---|---|
| Pago a Carla, após estornos | 3.142,54 | 3.142,51 |
| Pago a Deliziane | 14.154,72 | 14.154,68 |
| Pago a Gabriel | 2.216,21 | 2.216,21 |
| Pago a Gisele | 9.310,81 | 9.310,66 |
| Despesas da empresa | 24.646,07 | 24.646,07 |
| Faturamento 2024 / crédito de consórcio | 630.584,19 / 4.389.500,00 | iguais |
| Saldo final Bradesco | 18.234,66 | 18.235,07 |

As diferenças de centavos vêm do arredondamento: o CRM guarda cada parcela em centavos, e a planilha
soma valores com várias casas decimais. A diferença de R$ 0,41 no Bradesco já está na planilha: na
linha 100 do extrato, o saldo digitado (34.533,18) não bate com o saldo anterior + o crédito (34.532,77).

Há parcelas que aparecem só nas abas dos corretores e não em "A Receber" (ex.: as 9 da Silvana,
ainda sem data de recebimento). Elas entram no CRM como saldo a receber, por isso o total "a receber"
do CRM fica maior que o da aba "A Receber". O repasse dessas parcelas aparece no relatório de
**comissões pendentes** e entra no pagamento quando a baixa for lançada.

Na planilha de dezembro/2024 há uma parcela com recebimento digitado em 2012 (provável erro de
digitação de 2024); o pagamento correspondente aparece em dezembro de 2012 no relatório.

## 6. Arquitetura

```
crm/
  packages/
    core/          domínio + casos de uso + portas (TypeScript puro, sem React)
    infra-local/   adaptadores: IndexedDB e login local (PBKDF2-SHA-256)
    ui/            design system React "Noir Dourado" + catálogo de componentes
    app-base/      telas comuns aos dois CRMs (login, usuários, clientes, funil, propostas,
                   aprovações, estornos e vales, relatórios, painel de produção, importação)
    importer/      planilha → JSON (CLI em Node)
  apps/
    crm-seguros/   domain/ application/ infrastructure/ presentation/
    crm-consorcio/ domain/ application/ infrastructure/ presentation/
  e2e/             testes Playwright (fluxos e responsividade)
```

- **Arquitetura limpa**: `presentation → application → domain`. A infraestrutura implementa
  as portas (`Repositorio`, `GatewayAutenticacao`) e é ligada só em
  `apps/*/src/infrastructure/container.ts`. O ESLint impede que o `core` importe React ou infraestrutura.
- **Stack**: React 18, TypeScript estrito, Vite, React Router, TanStack Query, React Hook Form + Zod, CSS Modules.
- **Visual**: layout de painel de gestão (menu lateral marinho com grupos Principal, Relatórios e
  Sistema; barra superior com título e ações; indicadores com faixa e ícone), nas cores
  do site: marinho #1A2B4B e dourado #C9A85E, Lora nos títulos e Jost no resto.
- **CRM Seguros: direção "A5 · Vidro + Bento"** (escolhida pela Portella em 23/10/2026; substitui o
  Noir Dourado de marfim e cantos retos que o CRM usou antes). Com `<html data-app="seguros">`,
  `apps/crm-seguros/src/presentation/seguros.css` redefine os tokens: fonte **Sora**, cartões de vidro
  translúcido (`--cartao-fundo`, `--cartao-borda`, `--cartao-desfoque`, `--cartao-sombra`) sobre fundo com
  brilho dourado e azul (`--brilho`), cantos de 24 px nos cartões e botões em cápsula (`--botao-raio`),
  botão principal dourado com texto marinho. **Tema claro é o padrão**; o escuro (marinho profundo
  #0B1426) continua no seletor. Os componentes leem esses tokens com o valor antigo de reserva, por isso
  o Consórcio não muda (conferido por captura de tela contra a versão anterior).
- **Menu no topo** (`ConfigApp.navegacao = 'topo'`, só no Seguros): no computador a partir de 1280 px o
  menu vira uma cápsula no alto, com o grupo Principal à vista e os outros grupos, o tema, o usuário e
  Sair em "Mais"; tem a **busca rápida** (Ctrl K ou ⌘K: páginas e clientes, sem acento) e o botão
  **Nova proposta** (abre o formulário em `/propostas?nova=1`). Abaixo de 1280 px fica o menu lateral.
  A marca da cápsula usa `public/marca-icone.svg` e o nome em marinho (claro) ou marfim (escuro).
- **Painel inicial do Seguros** (`apps/crm-seguros/src/presentation/paginas/Painel.tsx`, cálculos em
  `application/painelInicial.ts`): segue a seção 0.7 com filtro Mês / Ano / Tudo. Mostra o aviso de
  propostas aguardando aprovação; produção (prêmio líquido) com mini-gráfico e variação; comissão recebida,
  repassada e saldo a receber (sem filtro); crescimento sobre o mês anterior, o mesmo mês do ano anterior e
  o acumulado do ano; barras dos últimos 12 meses (6 no celular); tabela por produtor (produção, saldo
  pendente e repasse previsto, com totais); pagamento do mês (repasse − estornos − vales, de
  `fechamentoDoMes`); novo × renovação; por produto e por seguradora (5 maiores + "Outras") e as
  renovações dos próximos 30 dias. O **produtor** vê só a própria produção, o próprio repasse, o próprio
  pagamento do mês e as próprias propostas aguardando aprovação, nunca a comissão que a corretora recebe.
  O que o painel antigo mostrava das apólices continua em Apólices e Renovações.
- **Interface refinada** (`ConfigApp.interface = 'refinada'`, ligada só no Seguros): confirmações antes
  de excluir, pagar, aplicar repasse e importar; campos de R$ e % com máscara ("1.500" = R$ 1.500,00);
  CPF/CNPJ, telefone e CEP com máscara; pilha de modais (Esc fecha só a de cima) e aviso de alterações
  não salvas; tabelas ordenáveis e com totais; menu do celular fora do Tab quando fechado; avisos de erro
  que ficam até serem dispensados; "Produtor" no lugar de "Corretor". Para levar ao Consórcio, basta
  ligar a mesma opção no `App.tsx` dele.
- **Tema**: claro (padrão), escuro ou automático (segue o aparelho), no rodapé do menu e em Minha conta.
  A escolha fica no navegador (`portella-crm:tema`) e um script no `index.html` aplica o tema antes da
  primeira pintura. As cores são tokens semânticos em `packages/ui/src/styles/global.css`
  (`--fundo`, `--superficie`, `--texto`, `--primaria`, `--destaque`, `--sucesso`…); os componentes só usam tokens.
- **Responsividade**: menu lateral fixo no desktop e menu deslizante no celular. Tabelas
  viram cartões abaixo de 900 px, formulários viram painel inferior no celular e alvos de toque têm ≥ 44 px.

### Backend (decisão pendente)

Hoje os dados ficam no **navegador** (IndexedDB), separados por app. Isso serve para
avaliar o sistema e para uso num único computador, mas **não sincroniza entre pessoas
nem tem backup**. Para a equipe usar de verdade, falta escolher um backend (ex.: Supabase,
com login e regras de acesso no servidor). A troca é feita só no `container.ts` de cada
app, com novas implementações de `Repositorio` e `GatewayAutenticacao`; as regras de perfil
de `core/application/permissoes.ts` viram políticas no servidor.

## 7. Qualidade

| Comando (em `crm/`) | O que faz |
|---|---|
| `npm test` | testes unitários e de componentes (Vitest) |
| `npm run test:e2e` | fluxos completos e responsividade em 360, 768 e 1280 px (Playwright). Em ambientes onde o Playwright não consegue subir os servidores sozinho, suba-os antes (`npm run catalogo`, `dev:seguros`, `dev:consorcio` e os dois modos demonstração nas portas 5185/5186): ele reaproveita os que estiverem rodando |
| `npm run typecheck` | TypeScript estrito |
| `npm run lint` | ESLint, incluindo as regras de camadas |
| `npm run build` | build de produção dos dois apps (PWA) |
| `sh ../scripts/build-vercel.sh` | build de publicação do site: o CRM de Seguros vai para `/seguro` (`VITE_BASE=/seguro/`), sem dados de teste e com as rotas depois do `#` |
