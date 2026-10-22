# portella-seguros

Site com CRM de seguros e consórcio da **Portella Corretora de Seguros** (Osasco – SP).

O repositório tem duas partes:

- **Site institucional** (one-page, na raiz): HTML, CSS e JavaScript puros, sem build e sem dependências.
- **CRM** (pasta [`crm/`](crm/)): dois webapps em React, um de **seguros** e outro, separado, de **consórcio**, com login e perfis de usuário. A especificação está em [`docs/CRM.md`](docs/CRM.md).

- Estrutura: segue a referência [lcedcorretora.com.br](https://lcedcorretora.com.br/).
- Conteúdo: o da Portella, de [portellacorretora.com.br](https://www.portellacorretora.com.br/).
- Visual: direção **Premium A "Noir Dourado"**, escolhida pela cliente. É predominantemente azul e dourado, com títulos em Lora e textos em Jost.

## Como rodar

Abra o `index.html` no navegador ou sirva a pasta:

```bash
npx serve .        # ou: python3 -m http.server 8000
```

## CRM de seguros e consórcio

```bash
cd crm
npm install
npm run dev:seguros       # http://localhost:5173
npm run dev:consorcio     # http://localhost:5174
npm test                  # testes unitários e de componentes
npm run test:e2e          # fluxos e responsividade (Playwright)
PLANILHA_SENHA='…' npm run importar --silent -- planilha.xlsx   # gera crm/dados/*.seed.json
```

No primeiro acesso, cada CRM pede para criar o administrador. Os dados ficam no navegador
até a escolha do backend (veja as pendências).

## Estrutura do site

```
index.html                     # página única com as 11 seções
assets/css/style.css           # estilos; cores e fontes em :root (variáveis CSS)
assets/js/main.js              # pó dourado, menu mobile, carrosséis, contadores, FAQ e modal de cotação
assets/img/brand/              # logos vetoriais da marca (originais e versões douradas)
assets/img/hero/               # fotos da consultora com fundo removido
assets/img/seguradoras/*.png   # logos das 12 seguradoras parceiras
```

## Seções (na ordem)

1. Header fixo: logo, menu (vira botão no celular) e "Cotar Agora"
2. Hero: consultora num arco com fio dourado, brasão com o ícone, seletor de seguro
3. Seguradoras parceiras: faixa contínua com os logos
4. Sobre: texto, contadores, "Por que escolher a Portella" e Missão, Visão e Valores
5. Seguros: carrossel com 8 produtos (autoplay, setas, arrastar e barra de progresso)
6. Depoimentos: carrossel contínuo
7. Dúvidas frequentes: acordeão
8. Chamada para cotação
9. Contato: dados e formulário
10. Blog: 3 matérias
11. Footer

Elementos extras: botão flutuante e modal de cotação em 2 etapas, que monta a mensagem para o WhatsApp.

## Pendências

- [ ] **Logos das seguradoras em alta qualidade.** Os atuais foram recortados de uma imagem pequena. Trocar pelos SVG/PNG oficiais em `assets/img/seguradoras/`, mantendo os nomes dos arquivos.
- [ ] Fotos dos 8 seguros e das matérias do blog.
- [ ] Número de WhatsApp: `WHATSAPP_NUMBER` em `assets/js/main.js` e o `href` do botão `.fab`.
- [ ] Horário de atendimento (seção Contato).
- [ ] CNPJ e SUSEP (footer).
- [ ] Depoimentos reais (ex.: avaliações do Google) e o link "Ver avaliações no Google".
- [ ] Resposta da pergunta "A cotação tem algum custo?".
- [ ] Matérias do blog.
- [ ] Integração do formulário de contato (hoje abre o e-mail via `mailto:`).
- [ ] Páginas legais (Privacidade, Termos, LGPD, Cookies).

### Pendências do CRM

- [x] Importador ajustado à planilha de dezembro (comissões, financeiro e consórcio). Conferência dos totais em `docs/CRM.md`.
- [ ] Cadastrar os corretores em Usuários antes de importar (Carla, Deliziane, Gabriel, Gisele, Silvana, Renata, Felippe).
- [ ] Completar nos CRMs o que a planilha não tem: CPF, telefone e e-mail dos clientes; fim real da vigência das apólices; grupo, cota e prazo das cotas de consórcio.
- [ ] **Texto da especificação** combinado na conversa anterior, para incorporar ao `docs/CRM.md`.
- [ ] **Backend**: hoje os dados ficam só no navegador, sem sincronizar entre pessoas e sem backup. Escolher entre Supabase, Firebase ou API própria e trocar o `container.ts` de cada app.
- [ ] Hospedagem dos dois apps, com redirecionamento de todas as rotas para o `index.html` (SPA).

Os pontos a preencher estão marcados no código com `TODO` ou `[inserir]`.
