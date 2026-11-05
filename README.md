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
vercel.json, scripts/build-vercel.sh  # publicação: site na raiz, CRM de Seguros em /seguro e demo do Consórcio
scripts/build-digilocal.sh, scripts/digilocal/  # pacote zip + .htaccess para a hospedagem da DigiLocal
crm/supabase/                  # banco do CRM de Seguros (migrations SQL) e a função `usuarios`
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
pasta `publico/` com o site na raiz e o **CRM de Seguros em `/seguro`**, já com os dados no Supabase
(ver "CRM de Seguros no Supabase" abaixo; `/seguros` também leva para lá). Quem tinha aberto a
demonstração antiga tem o banco dela apagado do navegador.
A **demonstração do CRM de Consórcio fica em `/consorcio`**, com cotas, lances e propostas fictícios
(dados só no navegador; o botão "Recomeçar" da faixa de demonstração volta ao início). A função `api/avaliacoes.js`
continua publicada. O CRM e a demonstração não são indexados pelo Google (`X-Robots-Tag: noindex`).

## CRM de Seguros no Supabase

Desde 02/11/2026 os dados do CRM de Seguros ficam no projeto Supabase **"Portella CRM"**
(`ruycxxylbqpqkgrznggw`, região São Paulo, plano gratuito), compartilhados pela equipe.

- **Banco:** `crm/supabase/migrations/` (aplicadas no projeto). Uma tabela por coleção do CRM, com o
  registro em `dados` (jsonb).
- **Regras de acesso:** ficam no banco (RLS e gatilhos), não só na tela.
  - O produtor vê só a própria carteira e as propostas em que participa; não aprova, não lança
    recebimentos e não vê o financeiro.
  - A gestão vê tudo.
  - Quem está inativo ou ainda com a senha provisória não vê nenhum dado.
  - A tabela `auditoria` guarda quem criou, alterou ou excluiu cada registro.
- **Logins:** a função `usuarios` (`crm/supabase/functions/usuarios/`) cria logins e redefine senhas com a
  chave de serviço, que só existe no servidor. O login vira um e-mail interno
  (`login@crm.portellacorretora.com.br`), e nenhum e-mail é enviado.
- **Senha provisória:** a mesma para usuário novo e senha redefinida (a administração sabe qual é). A troca é
  obrigatória no 1º acesso.
- **Configuração do app:** `crm/apps/crm-seguros/.env.production` tem a URL e a chave **publicável** do projeto.
  As duas são públicas por natureza e vão para o navegador; a proteção vem das regras do banco.
  A chave de serviço nunca entra no repositório.
- **Desenvolvimento e testes:** `npm run dev:seguros`, `npm test` e o e2e continuam com os dados no navegador
  (IndexedDB). Só o build de publicação usa o Supabase.

**1º acesso:** a tela "Primeiro acesso" cria a administradora e já cadastra a equipe (`padroes.ts`) com a
senha provisória. Leva uns 15 segundos. Faça o 1º acesso assim que o CRM for publicado, porque até lá qualquer
pessoa que abrir `/seguro` pode fazer isso. Os logins da equipe ficam com a senha provisória até cada pessoa
entrar e trocar.

**Painel do Supabase (uma vez):** em *Authentication › Sign In / Providers*, desligar
"Allow new users to sign up". Os logins são criados só pela função.

**Cuidados do plano gratuito:**
- Não há backup automático: exporte os relatórios em Excel toda semana até migrar para o plano Pro,
  que tem backup diário.
- O projeto pausa depois de 7 dias sem uso. Com uso diário, isso não acontece; se pausar, reative no painel.

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
1. **Domínio:** ver "Troca do domínio para a Vercel" abaixo.
2. **Google Search Console:** criar a propriedade do tipo *Domínio* (verificação por registro TXT no DNS),
   enviar `https://portellacorretora.com.br/sitemap.xml` e pedir a indexação da página inicial.
3. **Teste de pesquisa aprimorada do Google (Rich Results Test)** e **PageSpeed Insights:** rodar no domínio oficial depois da troca.
4. **Perfil da Empresa no Google:** categoria principal "Corretora de seguros"; nome, endereço, telefone e
   horário iguais aos do site; site `https://portellacorretora.com.br/`; fotos da fachada e da equipe;
   pedir avaliações aos clientes e responder todas.
5. **Pesquisa de palavras-chave** (Planejador do Google Ads, Google Trends, Ubersuggest, AnswerThePublic):
   com os dados em mãos, dá para criar páginas próprias por seguro (ex.: seguro auto em Osasco), que é o
   que mais ajuda a aparecer em buscas específicas. Hoje o site é uma página só.

## Troca do domínio para a Vercel

Situação em 05/11/2026: `portellacorretora.com.br` e o www ainda abrem o site antigo (feito no WebSite X5,
servidor LiteSpeed no IP `162.141.110.147`). O DNS do domínio fica na DigiLocal (nameservers
`ns1.digilocalmarketing.com.br` e `ns2.digilocalmarketing.com.br`), editado no painel
https://painel.digilocalmarketing.com.br/. O **e-mail** `contato@` também está nesse servidor e não pode cair na troca.

Registros atuais (não mexer nos de e-mail):

| Nome | Tipo | Valor | Na troca |
|---|---|---|---|
| `portellacorretora.com.br` | A | 162.141.110.147 | **trocar** pelo IP que a Vercel mostrar |
| `www` | CNAME | portellacorretora.com.br | **trocar** pelo CNAME que a Vercel mostrar |
| `mail` | A | 162.141.110.147 | manter |
| `portellacorretora.com.br` | MX | 0 mail.portellacorretora.com.br | manter |
| `portellacorretora.com.br` | TXT (SPF) | v=spf1 +a +mx … | manter |

Passos:

1. **Vercel** (projeto `portella`, conta felix-3fc8), *Settings → Domains*: adicionar `portellacorretora.com.br`
   (produção) e `www.portellacorretora.com.br` com redirecionamento para o sem www. A Vercel mostra o registro A
   e o CNAME a usar.
2. **Painel da DigiLocal**, zona DNS de `portellacorretora.com.br`: trocar só o A da raiz e o CNAME do www pelos
   valores da Vercel. Não trocar os nameservers no Registro.br: o e-mail continua na DigiLocal.
3. Esperar a Vercel marcar os dois domínios como válidos e emitir o certificado (TTL de 5 min; costuma levar
   menos de 1 hora). Conferir o site, `/seguro`, o envio e o recebimento de um e-mail de teste.
4. Depois: Google Search Console e Perfil da Empresa (itens 2 a 4 acima).

Enquanto a Portella usar o e-mail da DigiLocal, a hospedagem de lá não pode ser cancelada. O site antigo tinha
uma página só (`/index.html`), que já redireciona para `/` no `vercel.json`.

### Alternativa: hospedar na própria DigiLocal

Sem mexer no DNS: `sh scripts/build-digilocal.sh` gera `publico-digilocal.zip` (o build da Vercel mais os
`.htaccess` de `scripts/digilocal/`, que fazem o papel do `vercel.json`: https e sem www, `/index.html` → `/`,
`/seguros` → `/seguro/`, `noindex` no CRM e cache de fontes e imagens). Testado no Apache em 05/11/2026.

1. No gerenciador de arquivos do painel, compactar o site antigo (backup), baixar o zip e tirar de `public_html`
   tudo o que era dele. O backup não pode ficar dentro de `public_html`: o formulário antigo
   (`imemail/imEmailForm.php`) continuaria aberto na internet. Não mexer nas pastas de e-mail nem nas que
   começam com ponto, exceto o `.htaccess` antigo, que é trocado pelo novo.
2. Enviar o zip para `public_html` e extrair lá dentro (o `index.html` fica direto em `public_html`).
3. Conferir o certificado (AutoSSL) e abrir o site, `/seguro` e `/consorcio`.

Diferenças em relação à Vercel:
- **Avaliações do Google:** a função `api/avaliacoes.js` não roda lá; o site mostra as 5 avaliações fixas do HTML.
- **Atualizações:** cada mudança no site ou no CRM pede um novo zip e um novo envio (na Vercel é automático a cada push).
- O CRM de Seguros funciona igual: os dados ficam no Supabase, e as rotas usam `#`, sem regra de reescrita.

### Segurança da publicação

- O pacote não tem código-fonte, mapas de código nem chaves secretas. A única chave do Supabase que vai junto é a
  publicável, que é pública por natureza; os dados ficam protegidos pelas regras do banco (RLS nas 15 tabelas).
- Cabeçalhos de segurança no `vercel.json` e no `.htaccess`: HSTS (sem `includeSubDomains`, para não afetar
  webmail e painel), `nosniff`, `X-Frame-Options: SAMEORIGIN` (o CRM não abre dentro de outro site),
  `Referrer-Policy` e `Permissions-Policy`.
- Supabase (05/11/2026): cadastro aberto desligado, 1º acesso feito pela administradora. **8 dos 10 logins de
  produtor ainda estão com a senha provisória**, que aparece na tela de entrada do CRM e no código: quem souber um login entra,
  troca a senha e fica com a conta. Cada pessoa deve entrar e trocar a senha, ou a administração deve
  desativar quem ainda não vai usar.
- Proteção contra senhas vazadas (Supabase Auth) só existe no plano Pro.

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
  pagamento do mês). Os dados do CRM de Seguros ficam no Supabase desde 02/11/2026 (ver acima).
  Ajustes da reunião de 29/10/2026 feitos (apólice simplificada com status e checklist em PDF, ramo Moto,
  proposta com forma de pagamento e placa, saldo no lugar da parcela, comissões pendentes por cliente,
  origem e distribuição dos leads, endereço pelo CEP/CNPJ e instalação como aplicativo). Pendentes:
  - [x] Backend com banco de dados (CRM de Seguros no Supabase, 02/11/2026). Falta o 1º acesso da administradora.
  - [ ] CRM de Consórcio no Supabase (hoje continua como demonstração no navegador).
  - [ ] Aniversário dos clientes por e-mail (agora possível com o Supabase: tarefa agendada + envio de e-mail).
  - [ ] Plano Pro do Supabase, para ter backup diário automático.
  - [ ] Consórcio dentro do CRM de Seguros: aguardando a planilha e os dados de assembleia e contemplação da Deliziane.
  - [ ] Acesso para publicar o site (Deliziane vai pedir ao Bruno).

Os pontos a preencher estão marcados no código com `TODO` ou `[inserir]`.
