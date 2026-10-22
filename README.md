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
assets/img/brand/              # logos vetoriais da marca (originais e versões douradas)
assets/img/hero/               # fotos da consultora com fundo removido
assets/img/seguradoras/*.png   # logos das 12 seguradoras parceiras
assets/img/seguros/*.webp      # fotos dos 10 cards de seguros (Unsplash, tratadas em marinho e dourado)
```

## Seções (na ordem)

1. Header fixo: logo, menu (vira botão no celular) e "Cotar Agora"
2. Hero: consultora num arco com fio dourado, brasão com o ícone, seletor de seguro
3. Seguradoras parceiras: faixa contínua com os logos
4. Sobre: texto, contadores, "Por que escolher a Portella" e Missão, Visão e Valores
5. Seguros: carrossel com 10 produtos (autoplay, setas, arrastar e barra de progresso)
6. Depoimentos: carrossel contínuo
7. Dúvidas frequentes: acordeão
8. Chamada para cotação
9. Contato: dados e formulário
10. Blog: 3 matérias
11. Footer

Elementos extras: botão flutuante e modal de cotação em 2 etapas, que monta a mensagem para o WhatsApp.

## Avaliações do Google

A seção Depoimentos mostra as avaliações do Google da Portella e se atualiza sozinha:
a função da Vercel `api/avaliacoes.js` consulta a API do Google Places (New) e guarda a resposta
por 1 dia, então avaliações novas aparecem no site em até 24 h. A API devolve a nota, o total e
até 5 avaliações (as que o Google considera mais relevantes). Sem a chave, o site mostra só o botão
"Ver avaliações no Google".

Para ativar:

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto, ative a
   **Places API (New)** e crie uma **chave de API** (restrinja a chave à Places API).
2. Na Vercel, em *Settings → Environment Variables*, crie `GOOGLE_PLACES_API_KEY` com a chave.
   Opcional: `GOOGLE_PLACE_ID` com o ID do lugar, para não depender da busca pelo nome.
3. Faça um novo deploy.

Com o cache de 1 dia são cerca de 30 consultas por mês.

## Pendências

- [x] **Logos das seguradoras em alta qualidade:** versões oficiais (sites das seguradoras e Wikimedia Commons), em PNG 600x240 transparente. A Liberty virou Yelum (`yelum.png`).
- [ ] Nomes das outras 10 seguradoras parceiras (das 22), para incluir os logos na faixa.
- [x] Fotos dos 10 seguros: Unsplash (licença livre), em `assets/img/seguros/`.
- [ ] Fotos das matérias do blog.
- [x] Número de WhatsApp: (11) 94784-1580 em `WHATSAPP_NUMBER` (`assets/js/main.js`) e nos links `wa.me` do site.
- [ ] Horário de atendimento (seção Contato).
- [ ] CNPJ e SUSEP (footer).
- [ ] **Avaliações do Google:** o código está pronto (`api/avaliacoes.js` + `assets/js/main.js`). Falta criar a chave da API do Google Places e cadastrar `GOOGLE_PLACES_API_KEY` na Vercel (passo a passo abaixo).
- [ ] Resposta da pergunta "A cotação tem algum custo?".
- [ ] Matérias do blog.
- [ ] Integração do formulário de contato (hoje abre o e-mail via `mailto:`).
- [ ] Páginas legais (Privacidade, Termos, LGPD, Cookies).
- [ ] Próximas etapas: CRM de seguros e consórcio.

Os pontos a preencher estão marcados no código com `TODO` ou `[inserir]`.
