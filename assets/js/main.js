/* Portella Corretora de Seguros — interações */
(function () {
  'use strict';

  // WhatsApp da Portella (só números, com DDI e DDD)
  var WHATSAPP_NUMBER = '5511947841580';
  var PHONE_FALLBACK = 'tel:+5511947841580';

  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Pó dourado no hero ---------- */
  var dust = $('[data-dust]');
  if (dust && !reduceMotion) {
    for (var k = 0; k < 26; k++) {
      var p = document.createElement('span');
      var dur = 12 + ((k * 7) % 11), size = 2 + (k % 3);
      p.className = 'dust';
      p.style.cssText = 'left:' + ((k * 37.9) % 100).toFixed(1) + '%;width:' + size + 'px;height:' + size + 'px;opacity:.6;animation-duration:' + dur + 's;animation-delay:' + (-((k * 2.9) % dur)).toFixed(1) + 's';
      dust.appendChild(p);
    }
  }

  /* ---------- Menu mobile ---------- */
  var toggle = $('[data-menu-toggle]'), menu = $('#menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a, button', menu).forEach(function (a) {
      a.addEventListener('click', function () { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- Depoimentos: avaliações do Google via /api/avaliacoes ---------- */
  (function reviews() {
    var box = $('[data-reviews]'), track = $('[data-reviews-track]'), summary = $('[data-reviews-summary]'), link = $('[data-reviews-link]');
    if (!box || !track || !window.fetch) return;
    var star = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/></svg>';

    // estrelas das avaliações fixas do HTML (todas 5 estrelas no Google)
    $$('[data-stars]').forEach(function (e) { e.innerHTML = star + star + star + star + star; });

    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

    function card(a) {
      var fig = el('figure', 'review');
      var stars = el('div', 'review__stars'); stars.setAttribute('role', 'img'); stars.setAttribute('aria-label', a.nota + ' estrelas');
      for (var i = 0; i < a.nota; i++) stars.insertAdjacentHTML('beforeend', star);
      fig.appendChild(stars);
      fig.appendChild(el('blockquote', '', a.texto));
      var cap = el('figcaption');
      cap.appendChild(el('span', 'avatar', a.nome.trim().charAt(0).toUpperCase()));
      var name = el('span', 'review__name');
      var who = a.perfil ? el('a', '', a.nome) : document.createTextNode(a.nome);
      if (a.perfil) { who.href = a.perfil; who.target = '_blank'; who.rel = 'noopener'; }
      name.appendChild(who);
      name.appendChild(el('small', '', 'Google' + (a.quando ? ' · ' + a.quando : '')));
      cap.appendChild(name);
      fig.appendChild(cap);
      return fig;
    }

    fetch('/api/avaliacoes').then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (d) {
      if (d.link && link) link.href = d.link;
      if (d.nota && summary) {
        summary.textContent = d.nota.toFixed(1).replace('.', ',') + ' de 5 no Google · ' + d.total + (d.total === 1 ? ' avaliação' : ' avaliações');
        summary.hidden = false;
      }
      if (!d.avaliacoes || !d.avaliacoes.length) return;
      // troca as avaliações fixas do HTML e avisa o carrossel
      track.textContent = '';
      d.avaliacoes.forEach(function (a) { track.appendChild(card(a)); });
      track.dispatchEvent(new Event('carousel:update'));
    }).catch(function () { /* sem a API: ficam as avaliações fixas do HTML */ });
  })();

  /* ---------- Carrosséis (seguros, seguradoras e depoimentos): autoplay, setas, arrastar e progresso ---------- */
  $$('[data-carousel]').forEach(function (root) {
    var viewport = $('[data-viewport]', root), track = $('[data-track]', root), progress = $('[data-progress]', root);
    if (!viewport || !track) return;
    var index = 0, timer = null, DELAY = 3500;

    function cards() { return track.children; }
    function step() { var gap = parseFloat(getComputedStyle(track).columnGap) || 24; return cards()[0].getBoundingClientRect().width + gap; }
    function maxIndex() { return Math.max(0, cards().length - Math.floor((viewport.clientWidth + 24) / step())); }
    function render() {
      if (!cards().length) return;
      var max = maxIndex(), total = cards().length;
      if (index > max) index = max;
      track.style.transform = 'translateX(' + (-index * step()) + 'px)';
      if (progress) {
        progress.style.width = ((total - max) / total * 100) + '%';
        progress.style.left = (index / total * 100) + '%';
      }
    }
    function go(dir) {
      var max = maxIndex();
      index = index + dir;
      if (index > max) index = 0;          // chegou ao fim: volta ao começo
      if (index < 0) index = max;          // antes do começo: vai para o fim
      render();
    }
    function play() { stop(); if (!reduceMotion) timer = setInterval(function () { go(1); }, DELAY); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    $$('[data-scroll]', root).forEach(function (btn) {
      btn.addEventListener('click', function () { go(+btn.getAttribute('data-scroll')); play(); });
    });
    viewport.addEventListener('mouseenter', stop);
    viewport.addEventListener('mouseleave', play);
    viewport.addEventListener('focusin', stop);
    viewport.addEventListener('focusout', play);

    // arrastar com o dedo
    var startX = null, dx = 0;
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      startX = e.clientX; dx = 0; stop(); viewport.classList.add('is-dragging');
    });
    viewport.addEventListener('pointermove', function (e) {
      if (startX === null) return;
      dx = e.clientX - startX;
      track.style.transform = 'translateX(' + (-index * step() + dx) + 'px)';
    });
    function end() {
      if (startX === null) return;
      viewport.classList.remove('is-dragging'); startX = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); else render();
      play();
    }
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);

    // itens trocados depois (avaliações vindas da API): volta ao começo
    track.addEventListener('carousel:update', function () { index = 0; render(); play(); });
    window.addEventListener('resize', render);
    render(); play();
  });

  /* ---------- Revelar ao rolar ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Contadores ---------- */
  function countUp(el) {
    var target = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    var start = performance.now(), duration = 1800;
    (function tick(now) {
      var t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
      el.textContent = pre + Math.round(target * eased) + suf;
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { co.observe(el); });
  }

  /* ---------- FAQ: mantém só uma pergunta aberta ---------- */
  var faqItems = $$('.faq details');
  faqItems.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqItems.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- Seletor de seguro (lista personalizada sobre o select nativo) ---------- */
  // o assunto do formulário de contato usa a mesma lista de seguros do "Cotar", antes dos outros assuntos
  var subjectSelect = $('[data-subject-select]'), typeOptions = $('[data-type-select]');
  if (subjectSelect && typeOptions) {
    var others = $('optgroup', subjectSelect);
    $$('optgroup', typeOptions).forEach(function (g) { subjectSelect.insertBefore(g.cloneNode(true), others); });
  }
  // o campo "Qual seguro ou consórcio?" do modal usa a mesma lista da barra "Cotar"
  var modalTypeSelect = $('[data-modal-type]');
  if (modalTypeSelect && typeOptions) modalTypeSelect.innerHTML = typeOptions.innerHTML;
  var qsUid = 0;
  $$('[data-type-select], [data-subject-select], [data-modal-type]').forEach(function quoteSelect(select) {
    // data-qs-inline (modal): o seletor entra no lugar da lista, e o rótulo do campo continua visível
    var inline = select.hasAttribute('data-qs-inline');
    var label = inline ? select.parentNode : select.closest('label');
    var rotulo = inline && select.getAttribute('aria-labelledby');
    var placeholder = select.options[0].text;
    var ICONS = {
      auto: '<path d="M3 15l2-5.5A2 2 0 0 1 6.9 8h10.2a2 2 0 0 1 1.9 1.5L21 15v3h-2.5M3 15v3h2.5M3 15h18M8.5 18h7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
      vida: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
      saude: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
      dental: '<path d="M7 3.5c2 0 3 1 5 1s3-1 5-1c2.5 0 3.5 2.5 3 5-.6 3-1.8 4.4-2.3 7.5-.4 2.5-1 4.5-2.2 4.5-1.6 0-1.3-6-3.5-6s-1.9 6-3.5 6c-1.2 0-1.8-2-2.2-4.5C5.8 12.9 4.6 11.5 4 8.5c-.5-2.5.5-5 3-5z"/>',
      prev: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
      casa: '<path d="M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-6h4v6"/>',
      chave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2"/>',
      celular: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
      empresa: '<path d="M4 21V7l6-3v17M10 9h10v12M4 21h17M7 10v.01M7 13v.01M7 16v.01M14 13h2M14 16h2"/>',
      rc: '<path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
      consorcio: '<path d="M4 9.5h16M5 9.5V19h14V9.5M3 19.5h18M12 3l9 5H3z"/><path d="M8.5 12.5v4M12 12.5v4M15.5 12.5v4"/>',
      sinistro: '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5M12 17v.01"/>',
      outro: '<path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>'
    };
    function icon(key) {
      return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[key] || ICONS.rc) + '</svg>';
    }

    var wrap = document.createElement('div');
    wrap.className = 'qs';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'qs__button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="qs__value is-empty" id="qs-v' + (++qsUid) + '"></span><svg class="qs__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>';
    var valueEl = $('.qs__value', btn);
    valueEl.textContent = placeholder;
    if (rotulo) btn.setAttribute('aria-labelledby', rotulo + ' ' + valueEl.id);

    var panel = document.createElement('div');
    panel.className = 'qs__panel';
    panel.id = 'qs-panel' + (++qsUid);
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', rotulo ? document.getElementById(rotulo).textContent : placeholder);
    panel.tabIndex = -1;
    panel.hidden = true;
    btn.setAttribute('aria-controls', panel.id);

    var items = [];
    Array.prototype.forEach.call(select.children, function (node) {
      if (node.tagName !== 'OPTGROUP') return;
      var group = document.createElement('div');
      group.className = 'qs__group';
      group.setAttribute('role', 'group');
      var title = document.createElement('span');
      title.className = 'qs__title';
      title.id = 'qs-g' + (++qsUid);
      title.textContent = node.label;
      group.setAttribute('aria-labelledby', title.id);
      group.appendChild(title);
      Array.prototype.forEach.call(node.children, function (opt) {
        var item = document.createElement('div');
        item.className = 'qs__option';
        item.id = 'qs-o' + (++qsUid);
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        item.dataset.value = opt.value || opt.text;
        item.innerHTML = '<span class="qs__icon">' + icon(opt.dataset.icon) + '</span><span class="qs__text"><span class="qs__name"></span><span class="qs__desc"></span></span>' +
          '<svg class="qs__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
        $('.qs__name', item).textContent = opt.text;
        $('.qs__desc', item).textContent = opt.dataset.desc || '';
        item.addEventListener('mousedown', function (e) { e.preventDefault(); });
        item.addEventListener('click', function () { choose(item); });
        item.addEventListener('mousemove', function () { setActive(items.indexOf(item)); });
        group.appendChild(item);
        items.push(item);
      });
      panel.appendChild(group);
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    if (inline) {
      select.parentNode.insertBefore(wrap, select.nextSibling);
      select.hidden = true;
      // a lista escondida não pode ser "obrigatória" (o navegador não consegue focá-la): o envio confere
      select.required = false;
    } else {
      label.parentNode.insertBefore(wrap, label);
      label.hidden = true;
    }
    select.tabIndex = -1;

    var active = -1;
    function setActive(i) {
      items.forEach(function (it, k) { it.classList.toggle('is-active', k === i); });
      active = i;
      if (i >= 0) {
        panel.setAttribute('aria-activedescendant', items[i].id);
        items[i].scrollIntoView({ block: 'nearest' });
      } else {
        panel.removeAttribute('aria-activedescendant');
      }
    }
    function selectedIndex() {
      for (var i = 0; i < items.length; i++) if (items[i].dataset.value === select.value) return i;
      return -1;
    }
    // a lista abre sempre para baixo: fica fixa na tela (o hero corta o que passa da borda)
    // e, se não couber abaixo da barra, a página rola um pouco antes
    var header = $('.site-header');
    function place() {
      var b = wrap.getBoundingClientRect(), top = b.bottom + 14;
      if (b.bottom < (header ? header.getBoundingClientRect().bottom : 0)) { close(false); return; }
      panel.style.top = top + 'px';
      panel.style.maxHeight = Math.max(180, Math.min(440, window.innerHeight - top - 16)) + 'px';
    }
    function onResize() { close(false); }
    function open() {
      panel.hidden = false;
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      var r = panel.getBoundingClientRect(), b = wrap.getBoundingClientRect();
      var minTop = (header ? header.getBoundingClientRect().height : 0) + 16;
      var missing = b.bottom + 14 + Math.min(r.height, 440) + 16 - window.innerHeight;
      if (missing > 0) window.scrollBy(0, Math.min(missing, Math.max(0, b.top - minTop)));
      panel.classList.add('is-fixed');
      panel.style.left = r.left + 'px';
      panel.style.width = r.width + 'px';
      place();
      // capture: acompanha também a rolagem de dentro do modal
      window.addEventListener('scroll', place, { passive: true, capture: true });
      window.addEventListener('resize', onResize);
      setActive(Math.max(0, selectedIndex()));
      panel.focus({ preventScroll: true });
    }
    function close(refocus) {
      panel.hidden = true;
      panel.classList.remove('is-fixed');
      panel.removeAttribute('style');
      window.removeEventListener('scroll', place, { capture: true });
      window.removeEventListener('resize', onResize);
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (refocus) btn.focus();
    }
    function choose(item) {
      select.value = item.dataset.value;
      items.forEach(function (it) { it.setAttribute('aria-selected', it === item ? 'true' : 'false'); });
      valueEl.textContent = item.dataset.value;
      valueEl.classList.remove('is-empty');
      close(true);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // o formulário foi limpo (ex.: o modal fechou): volta ao texto inicial
    if (select.form) select.form.addEventListener('reset', function () {
      setTimeout(function () {
        items.forEach(function (it) { it.setAttribute('aria-selected', 'false'); });
        valueEl.textContent = placeholder;
        valueEl.classList.add('is-empty');
      });
    });

    btn.addEventListener('click', function () { if (panel.hidden) open(); else close(true); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(items.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active >= 0) choose(items[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') { close(false); }
      else if (e.key.length === 1) {
        var ch = e.key.toLowerCase();
        for (var n = 1; n <= items.length; n++) {
          var k = (active + n) % items.length;
          if (items[k].dataset.value.toLowerCase().charAt(0) === ch) { setActive(k); break; }
        }
      }
    });
    panel.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) close(false);
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target) && !panel.hidden) close(false); });
  });

  /* ---------- Modal de cotação ---------- */
  var modal = $('[data-modal]');
  var typeSelect = $('[data-type-select]');
  var tagEl = $('[data-modal-tag]'), stepEl = $('[data-modal-step]');
  var step1 = $('[data-step="1"]', modal), step2 = $('[data-step="2"]', modal);
  var lastFocus = null, currentType = '', plan = 'Individual ou familiar', lead = {};
  var modalType = $('[data-modal-type]', modal), details = $('[data-modal-details]', modal);
  // dica do campo "Algum detalhe?" para cada seguro
  var HINTS = {
    'Auto': 'Ex.: modelo e ano do veículo e o CEP onde ele fica à noite',
    'Vida': 'Ex.: sua idade e para quem é o seguro',
    'Saúde': 'Ex.: já tem plano? Prefere algum hospital ou rede?',
    'Odontológico': 'Ex.: para quantas pessoas e se já tem plano',
    'Previdência': 'Ex.: quanto pretende guardar por mês',
    'Residencial': 'Ex.: casa ou apartamento e o CEP do imóvel',
    'Fiança Locatícia': 'Ex.: valor do aluguel e a cidade do imóvel',
    'Celular e Portáteis': 'Ex.: aparelho, modelo e valor aproximado',
    'Empresarial': 'Ex.: ramo da empresa e cidade',
    'Responsabilidade Civil': 'Ex.: sua profissão ou atividade',
    'Consórcio': 'Ex.: imóvel, veículo ou serviço, e o valor da carta'
  };
  function isHealth(t) { return /^(Saúde|Odontológico)$/.test(t); }
  function show(group, on) {
    $$('[data-only="' + group + '"]', modal).forEach(function (el) {
      el.hidden = !on;
      $$('input, select, textarea', el).forEach(function (f) { f.disabled = !on; });
    });
  }
  function configStep2() {
    var t = currentType || (modalType && modalType.value) || '';
    show('sem-tipo', !currentType);
    show('saude', isHealth(t));
    if (details) details.placeholder = HINTS[t] || 'Conte rapidamente o que você precisa';
  }
  var tipoErro = $('[data-modal-type-erro]', modal);
  function erroTipo(on) {
    if (!tipoErro) return;
    tipoErro.hidden = !on;
    tipoErro.parentNode.classList.toggle('is-invalid', on);
  }
  if (modalType) modalType.addEventListener('change', function () { erroTipo(false); configStep2(); });

  function setStep(n) {
    step1.hidden = n !== 1; step2.hidden = n !== 2; stepEl.textContent = n;
    var lead1 = $('.modal__lead', modal); if (lead1) lead1.hidden = n !== 1;
    if (n === 2) configStep2();
    // foco no primeiro campo visível: o seletor de seguro, o tipo de plano (saúde) ou o detalhe
    var first = n === 1 ? $('input', step1)
      : $('.field:not([hidden]) .qs__button', step2) || $('.step-group:not([hidden]) button.plan', step2) || details;
    if (first) first.focus();
  }
  function openQuote(type) {
    currentType = type || (typeSelect && typeSelect.value) || '';
    tagEl.textContent = !currentType ? 'Cotação' : /^(Consórcio|Previdência)$/.test(currentType) ? currentType : 'Seguro ' + currentType;
    lastFocus = document.activeElement;
    modal.hidden = false; document.body.style.overflow = 'hidden';
    setStep(1);
  }
  function closeQuote() {
    modal.hidden = true; document.body.style.overflow = '';
    step1.reset(); step2.reset(); erroTipo(false);
    if (lastFocus) lastFocus.focus();
  }

  $$('[data-open-quote]').forEach(function (btn) {
    btn.addEventListener('click', function () { openQuote(btn.getAttribute('data-open-quote')); });
  });
  var quoteBar = $('[data-quote-bar]');
  if (quoteBar) quoteBar.addEventListener('submit', function (e) { e.preventDefault(); openQuote(); });
  $$('[data-close-quote]').forEach(function (btn) { btn.addEventListener('click', closeQuote); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeQuote(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeQuote(); });

  step1.addEventListener('submit', function (e) {
    e.preventDefault();
    lead.nome = step1.nome.value.trim(); lead.telefone = step1.telefone.value.trim();
    setStep(2);
  });

  $$('.plan', step2).forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.plan', step2).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true'); plan = b.textContent.trim();
    });
  });

  step2.addEventListener('submit', function (e) {
    e.preventDefault();
    if (modalType && !modalType.disabled && !modalType.value) {
      erroTipo(true);
      var seletor = $('[data-only="sem-tipo"] .qs__button', modal);
      if (seletor) seletor.focus();
      return;
    }
    var t = currentType || (modalType && modalType.value) || '', health = isHealth(t);
    var msg = [
      'Olá, Portella! Gostaria de uma cotação.',
      t ? 'Interesse: ' + t : '',
      'Nome: ' + (lead.nome || ''),
      'WhatsApp: ' + (lead.telefone || ''),
      health ? 'Plano: ' + plan : '',
      health && step2.profissao.value ? 'Profissão: ' + step2.profissao.value : '',
      health && step2.idade.value ? 'Idade do titular: ' + step2.idade.value : '',
      health && step2.pessoas.value ? 'Nº de pessoas: ' + step2.pessoas.value : '',
      details && details.value.trim() ? 'Detalhes: ' + details.value.trim() : ''
    ].filter(Boolean).join('\n');
    var url = WHATSAPP_NUMBER ? 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg) : PHONE_FALLBACK;
    window.open(url, WHATSAPP_NUMBER ? '_blank' : '_self');
    closeQuote();
  });

  /* ---------- Formulário de contato: abre o WhatsApp com a mensagem pronta ---------- */
  var contactForm = $('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = contactForm;
      var msg = [
        'Olá, Portella! Vim pelo site.',
        'Nome: ' + d.nome.value.trim(),
        d.email.value.trim() ? 'E-mail: ' + d.email.value.trim() : '',
        d.assunto.value ? 'Assunto: ' + d.assunto.value : '',
        '',
        d.mensagem.value.trim()
      ].filter(function (l, i) { return l || i === 4; }).join('\n');
      window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  /* ---------- Ano no rodapé ---------- */
  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
