# portella-seguros

Site com CRM de seguros e consórcio da **Portella Corretora de Seguros** (Osasco – SP).

Esta primeira etapa é o site institucional (one-page), feito em HTML, CSS e JavaScript puros: sem build e sem dependências.
O CRM de seguros e consórcio vem nas próximas etapas.

- Estrutura: segue a referência [lcedcorretora.com.br](https://lcedcorretora.com.br/).
- Conteúdo: o da Portella, de [portellacorretora.com.br](https://www.portellacorretora.com.br/).
- Visual: direção **Premium A "Noir Dourado"**, escolhida pela cliente. É predominantemente azul e dourado, com títulos em Lora e textos em Jost.

## Como rodar

Abra o `index.html` no navegador ou sirva a pasta:

```bash
npx serve .        # ou: python3 -m http.server 8000
```

## Estrutura

```
index.html                     # página única com as 11 seções
assets/css/style.css           # estilos; cores e fontes em :root (variáveis CSS)
assets/js/main.js              # pó dourado, menu mobile, carrosséis, contadores, FAQ e modal de cotação
api/avaliacoes.js              # função da Vercel: avaliações do Google (Places API)
crm/                           # CRM de seguros e consórcio (React); especificação em docs/CRM.md
vercel.json, scripts/build-vercel.sh  # publicação: site na raiz e demonstração do CRM em /seguro
assets/img/brand/              # logos vetoriais da marca (originais e versões douradas)
assets/img/hero/               # fotos da consultora com fundo removido
assets/img/seguradoras/         # logos da faixa (26): *.png originais 600x240; o site usa *.webp 300x120 (mais leves)
assets/fonts/                  # Jost e Lora (Google Fonts) servidas pelo próprio site
robots.txt, sitemap.xml        # para o Google (copiados para publico/ no build)
assets/img/seguros/*.webp      # fotos dos 10 cards de seguros (Unsplash, tratadas em marinho e dourado)
```

## Seções (na ordem)

1. Header fixo: logo, menu (vira botão no celular) e "Cotar Agora"
2. Hero: consultora num arco com fio dourado, brasão com o ícone, seletor de seguro
3. Seguradoras & Operadoras: carrossel com os logos
4. Sobre: texto, contadores, "Por que escolher a Portella" e Missão, Visão e Valores
5. Nossa equipe: fotos da equipe em arco com fio dourado
6. Seguros: carrossel com 10 produtos
7. Depoimentos: carrossel com as avaliações do Google
8. Dúvidas frequentes: acordeão
9. Chamada para cotação
10. Contato: dados e formulário
11. Footer

Os três carrosséis (seguradoras, seguros e depoimentos) usam o mesmo código (`[data-carousel]` no `main.js`): avançam um card a cada 3,5 s, têm setas, arrastar no celular e barra de progresso.

Elementos extras: botão flutuante e modal de cotação em 2 etapas, que monta a mensagem para o WhatsApp.

## Publicação na Vercel

O `vercel.json` instala o CRM (`cd crm && npm ci`) e roda `scripts/build-vercel.sh`, que monta a
pasta `publico/` com o site na raiz e a **demonstração do CRM de Seguros em `/seguro`**, só com a
equipe (administradora e produtores), sem clientes de teste; os dados ficam só no navegador e quem
abriu a demonstração antiga tem os clientes de teste dela apagados (`/seguros` também leva para lá).
A **demonstração do CRM de Consórcio fica em `/consorcio`**, com cotas, lances e propostas fictícios
(dados só no navegador; o botão "Recomeçar" da faixa de demonstração volta ao início). A função `api/avaliacoes.js`
continua publicada. As demonstrações não são indexadas pelo Google (`X-Robots-Tag: noindex`).

Para testar o build na máquina: `sh scripts/build-vercel.sh` e depois `cd publico && python3 -m http.server`.

## Avaliações do Google

A seção Depoimentos mostra as avaliações do Google da Portella e se atualiza sozinha:
a função da Vercel `api/avaliacoes.js` consulta a API do Google Places (New) e guarda a resposta
por 1 dia, então avaliações novas aparecem no site em até 24 h.
Enquanto a chave não estiver cadastrada, o site mostra 5 avaliações reais copiadas do Google em
22/10/2026 (fixas no `index.html`). A API devolve a nota, o total e
até 5 avaliações (as que o Google considera mais relevantes).

Para ativar:

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto, ative a
   **Places API (New)** e crie uma **chave de API** (restrinja a chave à Places API).
2. Na Vercel, em *Settings → Environment Variables*, crie `GOOGLE_PLACES_API_KEY` com a chave.
   Opcional: `GOOGLE_PLACE_ID` com o ID do lugar, para não depender da busca pelo nome.
3. Faça um novo deploy.

Com o cache de 1 dia são cerca de 30 consultas por mês.

## SEO (Google)

O site é preparado para o domínio oficial **https://portellacorretora.com.br/** (sem www): `canonical`,
`og:url`, `sitemap.xml` e os dados da corretora em schema.org (`InsuranceAgency` no `<head>`: nome, endereço,
WhatsApp, e-mail, horário, CNPJ, Instagram e Facebook). Esses dados precisam ser **idênticos** no rodapé, na
seção Contato e no Perfil da Empresa no Google. Se mudar endereço, telefone ou horário, atualize os três.

Velocidade (Lighthouse no celular, 25/10/2026): fontes servidas pelo próprio site (antes vinham do
fonts.googleapis.com e travavam a primeira pintura), logos em WebP 300x120 (754 KB → 212 KB), foto da
consultora com versão de 440px para o celular e cache longo para fontes e imagens no `vercel.json`.
Primeira pintura caiu de 3,0 s para 1,2 s; SEO, acessibilidade e boas práticas em 96–100.

O que depende da Portella (contas próprias):
1. **Domínio:** na Vercel, *Settings → Domains*, adicionar `portellacorretora.com.br` e `www.portellacorretora.com.br`
   (o www redireciona para o sem www) e trocar o DNS no registro do domínio conforme a Vercel indicar.
2. **Google Search Console:** criar a propriedade do tipo *Domínio* (verificação por registro TXT no DNS),
   enviar `https://portellacorretora.com.br/sitemap.xml` e pedir a indexação da página inicial.
3. **Teste de pesquisa aprimorada do Google (Rich Results Test)** e **PageSpeed Insights:** rodar no domínio oficial depois da troca.
4. **Perfil da Empresa no Google:** categoria principal "Corretora de seguros"; nome, endereço, telefone e
   horário iguais aos do site; site `https://portellacorretora.com.br/`; fotos da fachada e da equipe;
   pedir avaliações aos clientes e responder todas.
5. **Pesquisa de palavras-chave** (Planejador do Google Ads, Google Trends, Ubersuggest, AnswerThePublic):
   com os dados em mãos, dá para criar páginas próprias por seguro (ex.: seguro auto em Osasco), que é o
   que mais ajuda a aparecer em buscas específicas. Hoje o site é uma página só.

## Pendências

- [ ] **Nossa equipe:** 5 pessoas com foto (`assets/img/equipe/`): Mary (Consultora de Seguros), Gabriel
  (Especialista em Consórcio), Camilly e Cadu (Assistentes de Seguros) e Gisele (Especialista em Seguros e Saúde). Faltam as fotos de Mary, Gabriel, Camilly e Cadu em melhor qualidade; a da Gisele veio do original.

- [x] **Logos das seguradoras em alta qualidade:** versões oficiais (sites das seguradoras e Wikimedia Commons), em PNG 600x240 transparente. A Liberty virou Yelum (`yelum.png`).
- [ ] Nomes das outras 10 seguradoras parceiras (das 22), para incluir os logos na faixa.
- [x] Fotos dos 10 seguros: Unsplash (licença livre), em `assets/img/seguros/`.
- [x] Número de WhatsApp: (11) 94784-1580 em `WHATSAPP_NUMBER` (`assets/js/main.js`) e nos links `wa.me` do site.
- [x] Horário de atendimento (seção Contato): segunda a sexta, das 9h às 18h.
- [x] CNPJ e SUSEP (footer): CNPJ 17.965.782/0001-04, SUSEP 202014277.
- [ ] **Avaliações do Google:** o código está pronto (`api/avaliacoes.js` + `assets/js/main.js`). Falta criar a chave da API do Google Places e cadastrar `GOOGLE_PLACES_API_KEY` na Vercel (passo a passo abaixo).
- [x] Resposta da pergunta "A cotação tem algum custo?": não tem custo.
- [ ] Integração do formulário de contato (hoje abre o e-mail via `mailto:`).
- [ ] Páginas legais (Privacidade, Termos, LGPD, Cookies).
- [ ] CRM de seguros e consórcio: em `crm/` (React), especificação em `docs/CRM.md`. O CRM de Seguros
  passou pela revisão de UX/UI (interface refinada) e segue o visual "A5 · Vidro + Bento" escolhido pela
  cliente (tema claro padrão, menu no topo, busca Ctrl K e painel inicial com produção, comissões e
  pagamento do mês). Falta escolher o backend para os dados serem compartilhados entre computadores.

Os pontos a preencher estão marcados no código com `TODO` ou `[inserir]`.
