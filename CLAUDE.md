# Contexto para o Claude Code

- Projeto: site one-page da Portella Corretora de Seguros. HTML, CSS e JS puros, sem build.
- Idioma do site e dos commits: português do Brasil.
- Estrutura e animações seguem a referência https://lcedcorretora.com.br/ (só a estrutura).
  Não copiar logo, fotos nem textos da LC&D.
- Conteúdo oficial da Portella: https://www.portellacorretora.com.br/
  - Telefone: (11) 3592-5216
  - E-mail: contato@portellacorretora.com.br
  - Endereço: Av. Padre Vicente Melillo, 1399 – Umuarama, Osasco – SP, 06036-016
  - Instagram: @portellacorretora; Facebook: PortellaCorretoraDeSeguros
- Seguradoras parceiras (12): Porto Seguro, HDI, Ituran, Azul, Suhai, Tokio Marine, SulAmérica,
  Liberty, Bradesco Seguros, Mapfre, Allianz, Sompo.
- Cores e fonte ficam em `:root` no `assets/css/style.css`.
- **Direção escolhida pela cliente (21/10/2026): Premium A "Noir Dourado".** O site inteiro (index.html, style.css, main.js) já segue essa direção: predominantemente azul e dourado (pedido da cliente: sem seções marfim; seções alternam #0F1E3C, #1A2B4B e #15274A; logos das seguradoras em placas marfim com fio dourado), Lora nos títulos e Jost nos textos, consultora num arco com fio dourado e brasão com o ícone.
- Não inventar números, depoimentos ou dados (CNPJ, SUSEP, horário). Usar `[inserir]` até a Portella informar.
- Lista de pendências: README.md.
- Próximo passo combinado: trocar os logos das seguradoras por versões oficiais em alta qualidade
  (ex.: SVGs do Wikimedia Commons), mantendo os nomes dos arquivos em `assets/img/seguradoras/`.

## Identidade visual (recebida em 21/10/2026)
- Cores: branco #FFFFFF, laranja #F49629, azul-marinho #1A2B4B.
  Laranja em texto sobre fundo branco não atinge o contraste mínimo; para texto em destaque no branco use #C46A0E. Botão laranja: texto em azul-marinho.
- Fontes: Jost (textos, conforme o manual da marca) e Lora (títulos, próxima do nome "Portella" do logo).
- Logos vetoriais extraídos do manual em `assets/img/brand/`: icon-*, wordmark-*, logo-* (variações dark, navy e white).
- Fotos da consultora com fundo removido: `assets/img/hero/consultora-1..3.webp`.
- 3 opções de abertura (hero) estão no canvas de design: A (selo girando, fundo azul), B (ícone gigante com a mão "segurando" a foto) e C (painel azul com janelas que acendem). Aguardando a escolha da cliente.

## Direção premium (21/10/2026), substitui o laranja
- A cliente quer um visual mais premium: trocar o laranja (#F49629 / #C46A0E) por dourado.
- Paleta: marinho #1A2B4B, marinho profundo #0E1729, dourado #C9A85E (botões, com texto marinho),
  dourado claro #D9BC7E (destaques sobre fundo escuro), dourado profundo #B8924A (fios e linhas),
  dourado para texto sobre fundo claro #7A5C24 (contraste AA), marfim #F7F3EC / #F2ECE1, texto claro #F4EEE2.
- Estilo: títulos em Lora 400 com itálico dourado, rótulos em caixa alta com espaçamento largo,
  fios finos dourados, botões de cantos retos (raio 0–2px), sem sombras pesadas.
- Logos em dourado em `assets/img/brand/`: icon-gold-ivory, icon-gold-navy, icon-gold-mono,
  logo-gold-ivory, logo-gold-navy, wordmark-ivory, wordmark-gold.
- 3 versões premium da abertura no canvas: Premium A "Noir Dourado" (fundo escuro, foto num arco com
  fio dourado e brasão), Premium B "Editorial Marfim" (fundo marfim, nome "Portella" gigante atrás da
  consultora e selo girando) e Premium C "Galeria" (painel marinho + moldura dourada com a foto "saindo"
  do quadro e faixa com os nomes das seguradoras). Aguardando a escolha da cliente.
- Segunda rodada no canvas: Premium D "Cortina" (cortinas que abrem, moldura dourada, título dividido
  em volta da consultora), Premium E "Concierge" (fundo marfim, arco marinho, serviços em algarismos
  romanos e cartão de atendimento) e Premium F "Monograma" (padrão discreto com o ícone, medalhão com
  anel de texto girando, título revelado linha a linha).
- Não escrever "premium", "grife" ou "luxo" nos textos do site: o requinte deve vir do visual.

## CRM (pasta `crm/`, iniciado em 22/10/2026)
- Dois webapps React separados: `apps/crm-seguros` e `apps/crm-consorcio`, em monorepo npm workspaces.
  Especificação em `docs/CRM.md`.
- Arquitetura limpa: `packages/core` (domínio, permissões e casos de uso, sem React), `packages/infra-local`
  (IndexedDB + login PBKDF2), `packages/ui` (design system Noir Dourado), `packages/app-base` (telas comuns),
  `packages/importer` (planilha → JSON). A infraestrutura só é ligada em `apps/*/src/infrastructure/container.ts`.
- Perfis: admin, gestor e corretor (`core/src/application/permissoes.ts`). Corretor vê e edita só a própria carteira.
- A cada componente ou tela: teste (Vitest/Testing Library) e responsividade (Playwright em 360, 768 e 1280 px,
  sem rolagem horizontal e com alvos de toque ≥ 44 px no celular). Rodar `npm test` e `npm run test:e2e` em `crm/`.
- Dados reais de clientes, a planilha e a senha **nunca** vão para o Git (`crm/dados/` e `*.xlsx` estão no .gitignore).
  Os testes usam só dados fictícios ("Cliente Teste…").
- Backend ainda não escolhido: os dados ficam no navegador.
