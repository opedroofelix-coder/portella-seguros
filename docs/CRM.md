# CRM Portella: Seguros e Consórcio

Especificação dos dois sistemas de gestão de clientes (CRM) da **Portella Corretora de Seguros**:
um para **seguros** e outro, separado, para **consórcio**. Os dados iniciais vêm da planilha
de produção da corretora (`Portella_Corretora_Seguros_Dezembro.xlsx`).

> **Pendente:** colar aqui o texto combinado na conversa anterior. Ele será revisado e
> incorporado a este documento. O mapeamento definitivo das colunas da planilha depende da
> senha do arquivo (ver "Importação da planilha").

---

## 1. Objetivo

- Reunir num só lugar clientes, apólices, renovações e cotações de seguros.
- Manter o consórcio num CRM próprio, com cotas, lances e contemplações.
- Controlar o acesso por perfil: cada corretor vê a própria carteira e a gestão vê tudo.
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
- Ramo: Auto, Vida, Previdência, Saúde, Residencial, Fiança Locatícia, Responsabilidade Civil, Empresarial ou Outros.
- Campos: nº da apólice, bem segurado, vigência, prêmio líquido, prêmio total, comissão (%) e forma de pagamento.
- Situação calculada pela data: **vigente**, **a vencer** (até 30 dias), **vencida** ou **cancelada**.
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

## 5. Importação da planilha

1. A planilha é protegida por senha. O importador a abre **só em memória**: a senha e a
   planilha nunca vão para o repositório.
   ```bash
   cd crm
   PLANILHA_SENHA='…' npm run importar --silent -- /caminho/Portella_Corretora_Seguros_Dezembro.xlsx
   ```
2. O importador lê todas as abas visíveis, encontra a linha de cabeçalho e reconhece as
   colunas por sinônimos (ex.: "Segurado", "Cliente" e "Nome" viram *nome*; "Vencimento" e
   "Fim da vigência" viram *fim da vigência*). Os sinônimos ficam em
   `crm/packages/importer/src/mapeamento.ts`.
3. **Separação seguro × consórcio**:
   - abas com "consórcio" no nome vão para o consórcio; abas com "seguro", "apólice" etc. vão para seguros;
   - nas demais abas, cada linha é classificada: produto com "consórcio", ou grupo + cota
     preenchidos, ou só administradora (sem vigência) → consórcio; o resto → seguros.
4. Gera em `crm/dados/` (fora do Git): `seguros.seed.json`, `consorcio.seed.json` e
   `relatorio.json` (colunas reconhecidas, colunas não usadas, linhas ignoradas e o motivo).
5. No CRM, o administrador abre **Importar**, escolhe o arquivo, confere o resumo e os
   avisos e confirma. Reimportar o mesmo arquivo **atualiza** os registros, sem duplicar.
6. O corretor de cada linha é associado ao usuário de mesmo nome (nome completo ou
   primeiro nome, se não houver ambiguidade). Sem correspondência, o registro fica com
   quem importou, e um aviso é mostrado.

Nada é inventado: campos vazios na planilha ficam vazios no CRM.

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
