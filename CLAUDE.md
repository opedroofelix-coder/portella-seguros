# Contexto para o Claude Code

- Projeto: site one-page da Portella Corretora de Seguros. HTML, CSS e JS puros, sem build.
- Idioma do site e dos commits: português do Brasil.
- Estrutura e animações seguem a referência https://lcedcorretora.com.br/ (só a estrutura).
  Não copiar logo, fotos nem textos da LC&D.
- Conteúdo oficial da Portella: https://www.portellacorretora.com.br/
  - Telefone principal (divulgar no site): (11) 94784-1580, que é WhatsApp (links `wa.me/5511947841580`). Fixo (11) 3592-5216 só no rodapé.
  - E-mail: contato@portellacorretora.com.br
  - Endereço (atualizado pela cliente em 22/10/2026): Rua Ana Pereira Melo, 253 – Vila Campesina, Osasco – SP, 06023-080
  - Instagram: @portellacorretora; Facebook: PortellaCorretoraDeSeguros
- Faixa "Seguradoras & Operadoras" (26 logos): Porto Seguro, Allianz, Bradesco Seguros, SulAmérica, Tokio Marine,
  HDI, Mapfre, Yelum (antiga Liberty), Azul, Suhai, Ituran, Justos, Youse, Pier. A Sompo saiu (não faz mais
  automóvel). Operadoras de saúde (lista da cliente, 22/10/2026): Alice, Amil, Bradesco, Hapvida, Omint,
  Porto Seguro, Trasmontano, Prevent Senior, MedSênior, Sagrada Família, São Cristóvão, Única Saúde e
  SulAmérica Saúde. SulAmérica está na faixa pela marca do grupo; Bradesco Saúde e Porto Saúde têm logos próprios
  (bradesco-saude.png, porto-saude.png); entraram também Alice, Amil, Hapvida, Omint, Trasmontano, Prevent Senior, MedSênior, Sagrada Família, São Cristóvão e
  Única Saúde. Todas as operadoras da lista da cliente estão na faixa. O FAQ "Com quais
  seguradoras" não cita SulAmérica nem Sompo. No total a Portella trabalha com **22 seguradoras** (confirmado em 22/10/2026);
  o site diz "22 seguradoras". A lista de opções do CRM (`docs/CRM.md`) não é a lista de parceiras.
- A Portella também vende consórcio (imóvel, automóvel, moto, pesados, serviços). Nada do CRM interno
  (produtores, comissões, valores, faturamento) vai para o site.
- Cores e fonte ficam em `:root` no `assets/css/style.css`.
- **Direção escolhida pela cliente (21/10/2026): Premium A "Noir Dourado".** O site inteiro (index.html, style.css, main.js) já segue essa direção: predominantemente azul e dourado (pedido da cliente: sem seções marfim; seções alternam #0F1E3C, #1A2B4B e #15274A; logos das seguradoras em placas marfim com fio dourado), Lora nos títulos e Jost nos textos, consultora num arco com fio dourado e brasão com o ícone.
- Não inventar números, depoimentos ou dados. Usar `[inserir]` até a Portella informar.
- Dados confirmados (25/10/2026): CNPJ 17.965.782/0001-04 · SUSEP 202014277 (rodapé); horário de atendimento
  segunda a sexta, das 9h às 18h (seção Contato).
- Lista de pendências: README.md.
- Ordem dos seguros (pedido da cliente): 1. Seguro Auto, 2. Plano de Saúde, 3. Consórcio, 4. Celular e
  Portáteis; os demais sem ordem definida.
- Seção "Nossa equipe" (depois do Sobre): 5 produtores com foto (26/10/2026), cargo "Produtor", nesta ordem:
  Mary, Gabriel, Camilly, Cadu e Gisele. Fotos em `assets/img/equipe/<nome>.webp` (WebP 600x800); as de Mary,
  Gabriel, Camilly e Cadu vieram em baixa qualidade e serão trocadas pelas originais.
- A cotação não tem custo (confirmado pela cliente).
- Logos das seguradoras: versões oficiais em `assets/img/seguradoras/` (PNG 600x240 transparente); o site usa
  as cópias WebP 300x120 (logo novo: gerar o .webp junto).
- Domínio oficial do site: https://portellacorretora.com.br/ (sem www). canonical, og:url, sitemap e o schema.org
  `InsuranceAgency` do `<head>` usam esse endereço; dados da corretora iguais no schema, no rodapé e na seção Contato.
- Fontes Jost e Lora servidas de `assets/fonts/` (não voltar a carregar do fonts.googleapis.com).

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

## CRM de Seguros (23/10/2026)
- O site continua no Noir Dourado. O **CRM de Seguros** segue a direção **"A5 · Vidro + Bento"** escolhida
  pela cliente: fonte Sora, cartões de vidro com cantos arredondados, botões em cápsula, marinho e dourado,
  **tema claro padrão** e escuro opcional, menu no topo com busca Ctrl K. Tokens em
  `crm/apps/crm-seguros/src/presentation/seguros.css`; o Consórcio não muda.
