# CRM Portella: Seguros e Consórcio

Especificação dos dois sistemas de gestão de clientes (CRM) da **Portella Corretora de Seguros**:
um para **seguros** e outro, separado, para **consórcio**. Os dados iniciais vêm da planilha
de produção da corretora (`Portella_Corretora_Seguros_Dezembro.xlsx`).

> **Pendente:** colar aqui o texto combinado na conversa anterior. Ele será revisado e
> incorporado a este documento.

---

## 1. Objetivo

- Reunir num só lugar clientes, apólices, renovações e cotações de seguros.
- Manter o consórcio num CRM próprio, com cotas, lances e contemplações.
- Controlar o acesso por perfil: cada corretor vê a própria carteira e a gestão vê tudo.
- Substituir o controle de comissões e o financeiro feitos hoje na planilha.
- Funcionar como webapp instalável (PWA) no computador e no celular.

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
- No primeiro acesso, o sistema pede para criar o administrador. Não existe senha padrão.
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
