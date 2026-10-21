# Portella Corretora de Seguros — novo site

Site institucional one-page da Portella Corretora de Seguros (Osasco – SP).
HTML, CSS e JavaScript puros: sem build, sem dependências.

A estrutura segue a referência [lcedcorretora.com.br](https://lcedcorretora.com.br/).
O conteúdo é o da Portella, de [portellacorretora.com.br](https://www.portellacorretora.com.br/).
A identidade visual (cores e fonte) ainda é provisória.

## Como rodar

Abra o `index.html` no navegador, ou sirva a pasta:

```bash
npx serve .        # ou: python3 -m http.server 8000
```

## Estrutura

```
index.html                     # página única com as 11 seções
assets/css/style.css           # estilos; cores e fonte em :root (variáveis CSS)
assets/js/main.js              # partículas, carrosséis, contadores, FAQ, modal de cotação
assets/img/seguradoras/*.png   # logos das 12 seguradoras parceiras
```

## Seções (na ordem)

1. Header: logo, menu e botão "Cotar Agora"
2. Hero: título, seletor de tipo de seguro e foto
3. Seguradoras: faixa de logos em loop
4. Sobre: texto, contadores e "Por que escolher a Portella?"
5. Nossas Soluções: carrossel com 8 produtos
6. Depoimentos: carrossel contínuo
7. Dúvidas Frequentes: acordeão
8. CTA: "Pronto para se proteger?"
9. Fale Conosco: contatos e formulário
10. Blog: 3 matérias
11. Footer

Elementos extras: botão flutuante (WhatsApp) e modal de cotação em 2 etapas, que monta a mensagem para o WhatsApp.

## Pendências

- [ ] **Logos das seguradoras em alta qualidade.** Os atuais foram recortados de uma imagem pequena; trocar pelos SVG/PNG oficiais em `assets/img/seguradoras/`, mantendo os nomes dos arquivos.
- [ ] Logo da Portella (hoje o nome está em texto no header e no footer).
- [ ] Foto principal do hero e fotos dos 8 produtos.
- [ ] Número de WhatsApp: `WHATSAPP_NUMBER` em `assets/js/main.js` e `href` do botão `.fab`.
- [ ] Horário de atendimento (seção Contato).
- [ ] CNPJ e SUSEP (footer).
- [ ] Depoimentos reais (ex.: avaliações do Google) e link "Ver mais avaliações no Google".
- [ ] Resposta da pergunta "A cotação tem algum custo?".
- [ ] Matérias do blog.
- [ ] Integração do formulário de contato (hoje abre o e-mail via `mailto:`).
- [ ] Páginas legais (Privacidade, Termos, LGPD, Cookies).
- [ ] Identidade visual da Portella: ajustar as variáveis em `:root` no `style.css`.
- [ ] Botão de tema (claro/escuro) no header: hoje é só visual.

Os pontos a preencher estão marcados no código com `TODO` ou `[inserir]`.
