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
- Produtores atuais (pela conversa): Deliziane, Mary, Gisele, Gabriel, Danila, Luana e Renata
  (Cadu foi retirado). A planilha de dezembro/2024 traz também Carla, Felippe e Silvana. A lista
  deve ser editável: incluir e retirar produtores.
- **% de repasse padrão por produtor**, sugerido ao lançar a proposta e editável caso a caso:
  Deliziane 40%, Danila 50%, Luana 50%, Gisele 50%, Mary 15%.

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

| Requisito | Situação no CRM atual |
|---|---|
| Login por usuário, perfis administrador e corretor (produtor) | ✔ existe (também há o perfil gestor) |
| Senha padrão `1234` com troca obrigatória no 1º acesso | ✘ falta: hoje o administrador define a senha inicial, com no mínimo 8 caracteres |
| Produtor vê só as próprias propostas | ✔ existe |
| Fluxo de aprovação de propostas, com aviso para a administradora | ✘ falta |
| Proposta com tipo de negócio (novo × renovação) | ✘ falta |
| Comissão trabalhada (%) e comissão a receber calculada | ◐ parcial: a apólice tem prêmio e %, mas a comissão a receber fica nas parcelas |
| Recebimentos por saldo, com parcela em texto livre | ◐ parcial: cada parcela é um lançamento separado; falta o saldo por proposta |
| Comissão acima de 100% e % vitalício | ✘ falta |
| Vários produtores por proposta, cada um com o seu % e "Receberá R$ X" | ◐ parcial: há o "repasse adicional" da importação, mas o formulário só tem um responsável |
| % de repasse padrão por produtor | ✘ falta |
| Listas editáveis de produtos e seguradoras | ✘ falta: listas fixas no código (seguradora fora da lista entra pelo nome) |
| Estornos com segurado, nº da apólice, seguradora e produto | ◐ parcial: estorno é um tipo de lançamento de comissão |
| Vales | ✘ falta |
| Relatório de pagamento mensal (recebido − estornos − vales) com PDF e Excel | ◐ parcial: há o "Repasse por corretor" na tela; faltam vales e exportação |
| Relatório de comissões pendentes por produtor | ◐ parcial: filtro "a receber" na tela de Comissões |
| Painel: novo × renovação, por produto e seguradora em R$, crescimento mês a mês e ano a ano | ◐ parcial: há gráficos por seguradora e ramo (em quantidade); faltam o resto |
| Consórcio | ✔ CRM separado (na conversa, consórcio era um produto do mesmo sistema) |
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
| Lançar comissões, dar baixa e pagar repasses | ✔ | ✔ | – (consulta as próprias) |
| Financeiro da corretora | ✔ | ✔ | – |

Regras extras:
- No primeiro acesso, o sistema pede para criar o administrador. Hoje não existe senha padrão
  (a seção 0.2 pede senha inicial `1234` com troca obrigatória; ainda não implementado).
- O sistema sempre mantém pelo menos um administrador ativo.
- Um usuário desativado não entra mais e perde a sessão aberta.
- Senha com no mínimo 8 caracteres. Cada pessoa pode trocar a própria senha em "Minha conta".

## 3. CRM de Seguros

**Painel**
- Apólices ativas, renovações em 30/60/90 dias, prêmio ativo e comissão prevista.
- Próximas renovações e distribuição por seguradora e por ramo.
- Resumo do funil de cotações.

**Clientes**
- Pessoa física ou jurídica, com validação de CPF/CNPJ, telefone/WhatsApp, e-mail, endereço e observações.
- Busca por nome, documento, telefone ou cidade.
- A ficha do cliente mostra os dados e as apólices dele, com botão para o WhatsApp.

**Apólices**
- Seguradora: uma das 12 parceiras (Porto Seguro, HDI, Ituran, Azul, Suhai, Tokio Marine,
  SulAmérica, Liberty, Bradesco Seguros, Mapfre, Allianz, Sompo) ou "Outra".
- Ramo: Auto, Vida, Previdência, Saúde, Residencial, Fiança Locatícia, Responsabilidade Civil, Empresarial,
  Dental, Transportes, Equipamentos portáteis (bike, celular, câmera), Pet ou Outros.
- Seguradoras fora das 12 parceiras (Yelum, GNDI, Mitsui, Akad, Aliro…) ficam pelo nome.
- Campos: nº da apólice, bem segurado, vigência, prêmio líquido, prêmio total, comissão (%) e forma de pagamento.
- Situação calculada pela data: **vigente**, **a vencer** (até 30 dias), **vencida** ou **cancelada**.
- Contratos contínuos (vida, saúde, dental…) ficam sem fim de vigência e não entram na fila de renovação.
- **Vigência estimada**: a planilha não tem o fim da vigência; nas apólices importadas de ramos anuais
  o fim é a data da proposta + 12 meses e aparece como "(estimada)" até alguém confirmar na edição.
- Comissão prevista = prêmio líquido × comissão (%).

**Renovações**
- Fila das apólices que vencem em 15, 30, 60 ou 90 dias (e das vencidas há até 30 dias) e ainda não foram renovadas.
- Ações: chamar no WhatsApp (marca como "em contato"), **Renovar** (cria a apólice nova
  com 12 meses de vigência e marca a anterior como renovada) e "Não renovou".

**Cotações (funil)**
- Etapas: Novo → Em contato → Proposta enviada → Fechado / Perdido (com motivo).
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

## 4.1 Comissões (nos dois CRMs)

Substitui as abas "A Receber" e "Comissões <corretor>".

- Cada linha é uma **parcela de comissão** de uma venda: cliente, produto, seguradora/administradora,
  nº da proposta, parcela (ex.: 8/10), data do recebimento, prêmio (ou crédito), comissão a receber,
  comissão recebida, % e valor do **repasse ao corretor** e repasse pago.
- Tipos: venda de corretor (com repasse), **venda da corretora** (sem repasse) e **estorno** (valores negativos).
- Quando dois corretores recebem sobre a mesma parcela (ex.: supervisão), o segundo vira um
  **repasse adicional** ligado à parcela, sem repetir o valor da seguradora.
- Tela com filtro por mês, corretor e situação (a receber, recebida, estorno); indicadores de
  recebido, a receber, repasse a pagar e líquido da corretora; quadro **Repasse por corretor** com
  botão **Quitar**; botão **Dar baixa** nas parcelas a receber.
- O corretor vê só as próprias parcelas e só os valores do repasse.

## 4.2 Financeiro (CRM de Seguros, administrador e gestor)

Substitui as abas "Bradesco", "Demonstrativo", "Poupança" e "Faturamento".

- **Resumo do mês**: saldo da conta corrente, entradas, saídas, despesas em aberto, saldos por
  conta, faturamento mensal e próximas despesas.
- **Extrato**: movimentos por conta (Bradesco, Poupança Portella, Tracker) com saldo acumulado.
- **Despesas**: contas a pagar com vencimento, pagamento e situação (paga, em aberto, vencida); botão **Pagar**.
- **Faturamento**: fechamento mensal (comissões recebidas e crédito de consórcio vendido).

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

**Antes de importar, cadastre os corretores em Usuários** com o nome que aparece na planilha
(Carla, Deliziane, Gabriel, Gisele, Silvana, Renata, Felippe). O importador liga cada venda ao
usuário de mesmo nome. Sem correspondência, a venda fica com quem importou e aparece um aviso.

### Como cada aba é usada (planilha de dezembro/2024)

| Aba | Vai para |
|---|---|
| A Receber | clientes, apólices/cotas e parcelas de comissão (produtor, comissão a receber e recebida) |
| Comissoes Carla, Deliziane, Felippe, Gabriel, Gisele, Silvana | repasse ao corretor (%, valor e pago) e estornos |
| Essencial Allianz / Renata | ignoradas: detalhamento da assessoria; os valores líquidos já estão em "A Receber" |
| Bradesco | extrato da conta corrente |
| Demonstrativo de Receitas e Despesas | despesas da empresa (receitas e repasses o CRM calcula) |
| Poupanca Portella | depósitos da poupança e do Tracker |
| Faturamento | faturamento mensal de 2024 e crédito de consórcio vendido |

Colunas usadas: Data Proposta, Nr. Proposta, Nome/Razão Social, Produto, Cia Seguradora,
Produtor, Parcela, Dt. Recebto., Prêmio/Prêmio Líquido, Comissão a Receber/Recebida, Comissão a
pagar Corretor, Comissão Paga (e as equivalentes da seção "Controle de Estornos").

Regras:
- Produto "Consorcio" (ou administradora Magalu) → CRM de Consórcio; o resto → CRM de Seguros.
- A mesma parcela nas abas "A Receber" e "Comissões <corretor>" é reconhecida por seguradora +
  nº da proposta + parcela. A data de recebimento não entra na comparação, porque na aba do corretor
  ela é a data do repasse.
- Produtor "Corretora" → venda da corretora, sem repasse.
- "Endosso" e "Estorno" geram só a comissão, sem nova apólice.
- A planilha não tem CPF, telefone nem e-mail: os clientes entram só com o nome e os demais dados
  são completados no CRM.

### Conferência com os totais da planilha

| Item | CRM | Planilha |
|---|---|---|
| Repasse Carla / pago após estornos | 3.257,34 / 3.142,54 | 3.257,31 / 3.142,51 |
| Repasse Deliziane / pago | 14.461,28 / 14.154,72 | 14.461,25 / 14.154,68 |
| Repasse Gabriel | 2.216,21 | 2.216,21 |
| Repasse Gisele / pago | 9.995,31 / 9.310,81 | 9.995,17 / 9.310,66 |
| Repasse Silvana | 348,31 | 348,33 |
| Despesas da empresa | 24.646,07 | 24.646,07 |
| Faturamento 2024 / crédito de consórcio | 630.584,19 / 4.389.500,00 | iguais |
| Poupança / Tracker | 65.000,00 / 19.000,00 | iguais |
| Saldo final Bradesco | 18.234,66 | 18.235,07 |

As diferenças de centavos vêm do arredondamento: o CRM guarda cada parcela em centavos, e a planilha
soma valores com várias casas decimais. A diferença de R$ 0,41 no Bradesco já está na planilha: na
linha 100 do extrato, o saldo digitado (34.533,18) não bate com o saldo anterior + o crédito (34.532,77).

Há parcelas que aparecem só nas abas dos corretores e não em "A Receber" (ex.: as 9 da Silvana).
Elas entram no CRM, mas por isso o total "a receber" do CRM fica maior que o da aba "A Receber".

## 6. Arquitetura

```
crm/
  packages/
    core/          domínio + casos de uso + portas (TypeScript puro, sem React)
    infra-local/   adaptadores: IndexedDB e login local (PBKDF2-SHA-256)
    ui/            design system React "Noir Dourado" + catálogo de componentes
    app-base/      telas comuns aos dois CRMs (login, usuários, clientes, funil, importação)
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
- **Visual**: as mesmas cores e fontes do site (marinho, dourado, Lora e Jost).
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
| `npm run test:e2e` | fluxos completos e responsividade em 360, 768 e 1280 px (Playwright) |
| `npm run typecheck` | TypeScript estrito |
| `npm run lint` | ESLint, incluindo as regras de camadas |
| `npm run build` | build de produção dos dois apps (PWA) |
