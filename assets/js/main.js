/* Portella Corretora de Seguros — interações */
(function () {
  'use strict';

  // TODO: preencher com o WhatsApp da Portella (só números, com DDI e DDD), ex.: '5511999999999'
  var WHATSAPP_NUMBER = '';
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
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- Marquees: duplica o conteúdo para o loop contínuo ---------- */
  $$('[data-marquee]').forEach(function (track) {
    Array.prototype.slice.call(track.children).forEach(function (item) {
      var clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* ---------- Estrelas dos depoimentos ---------- */
  var star = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/></svg>';
  $$('[data-stars]').forEach(function (el) { el.innerHTML = star + star + star + star + star; });

  /* ---------- Carrossel de seguros: autoplay, setas, arrastar e progresso ---------- */
  (function carousel() {
    var viewport = $('[data-viewport]'), track = $('[data-track]'), progress = $('[data-progress]');
    if (!viewport || !track) return;
    var cards = Array.prototype.slice.call(track.children);
    var index = 0, timer = null, DELAY = 3500;

    function step() { var gap = parseFloat(getComputedStyle(track).columnGap) || 24; return cards[0].getBoundingClientRect().width + gap; }
    function maxIndex() { return Math.max(0, cards.length - Math.floor((viewport.clientWidth + 24) / step())); }
    function render() {
      var max = maxIndex();
      if (index > max) index = max;
      track.style.transform = 'translateX(' + (-index * step()) + 'px)';
      if (progress) {
        var visible = cards.length - max;
        progress.style.width = (visible / cards.length * 100) + '%';
        progress.style.left = (index / cards.length * 100) + '%';
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

    $$('[data-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () { go(+btn.getAttribute('data-scroll')); play(); });
    });
    viewport.addEventListener('mouseenter', stop);
    viewport.addEventListener('mouseleave', play);
    viewport.addEventListener('focusin', stop);
    viewport.addEventListener('focusout', play);

    // arrastar com o dedo / mouse
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

    window.addEventListener('resize', render);
    render(); play();
  })();

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

  /* ---------- Modal de cotação ---------- */
  var modal = $('[data-modal]');
  var typeSelect = $('[data-type-select]');
  var tagEl = $('[data-modal-tag]'), stepEl = $('[data-modal-step]');
  var step1 = $('[data-step="1"]', modal), step2 = $('[data-step="2"]', modal);
  var lastFocus = null, currentType = '', plan = 'Individual', lead = {};

  function setStep(n) {
    step1.hidden = n !== 1; step2.hidden = n !== 2; stepEl.textContent = n;
    var first = $('input, button.plan', n === 1 ? step1 : step2); if (first) first.focus();
  }
  function openQuote(type) {
    currentType = type || (typeSelect && typeSelect.value) || '';
    tagEl.textContent = currentType ? 'Seguro ' + currentType : 'Cotação';
    lastFocus = document.activeElement;
    modal.hidden = false; document.body.style.overflow = 'hidden';
    setStep(1);
  }
  function closeQuote() {
    modal.hidden = true; document.body.style.overflow = '';
    step1.reset(); step2.reset();
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
    var msg = [
      'Olá, Portella! Gostaria de uma cotação.',
      currentType ? 'Seguro: ' + currentType : '',
      'Nome: ' + (lead.nome || ''),
      'Telefone: ' + (lead.telefone || ''),
      'Plano: ' + plan,
      step2.profissao.value ? 'Profissão: ' + step2.profissao.value : '',
      step2.idade.value ? 'Idade: ' + step2.idade.value : '',
      step2.pessoas.value ? 'Nº de pessoas: ' + step2.pessoas.value : ''
    ].filter(Boolean).join('\n');
    var url = WHATSAPP_NUMBER ? 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg) : PHONE_FALLBACK;
    window.open(url, WHATSAPP_NUMBER ? '_blank' : '_self');
    closeQuote();
  });

  /* ---------- Formulário de contato (provisório: abre o e-mail) ---------- */
  var contactForm = $('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = contactForm;
      var body = 'Nome: ' + d.nome.value + '\nE-mail: ' + d.email.value + '\nTelefone: ' + d.telefone.value + '\n\n' + d.mensagem.value;
      window.location.href = 'mailto:contato@portellacorretora.com.br?subject=' +
        encodeURIComponent(d.assunto.value || 'Contato pelo site') + '&body=' + encodeURIComponent(body);
    });
  }

  /* ---------- Ano no rodapé ---------- */
  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
