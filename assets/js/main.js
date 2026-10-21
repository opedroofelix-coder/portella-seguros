/* Portella Corretora de Seguros — interações */
(function () {
  'use strict';

  // TODO: preencher com o WhatsApp da Portella (só números, com DDI e DDD), ex.: '5511999999999'
  var WHATSAPP_NUMBER = '';
  var PHONE_FALLBACK = 'tel:+551135925216';

  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Partículas douradas ---------- */
  var particles = $('[data-particles]');
  if (particles && !reduceMotion) {
    for (var k = 0; k < 36; k++) {
      var p = document.createElement('span');
      var dur = 8 + ((k * 13) % 9);
      p.className = 'particle';
      p.style.left = ((k * 37.3) % 100).toFixed(2) + '%';
      p.style.height = (8 + ((k * 5) % 12)) + 'px';
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = (-((k * 7.7) % dur)).toFixed(2) + 's';
      particles.appendChild(p);
    }
  }

  /* ---------- Marquees: duplica o conteúdo para o loop contínuo ---------- */
  $$('[data-marquee]').forEach(function (track) {
    $$(':scope > *', track).forEach(function (item) {
      var clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* ---------- Estrelas dos depoimentos ---------- */
  var star = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#C9A24A" aria-hidden="true"><path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/></svg>';
  $$('[data-stars]').forEach(function (el) { el.innerHTML = star + star + star + star + star; });

  /* ---------- Revelar ao rolar ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Contadores ---------- */
  function countUp(el) {
    var target = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    var start = performance.now(), duration = 2000;
    (function tick(now) {
      var t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
      el.textContent = pre + Math.round(target * eased) + suf;
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- FAQ (acordeão) ---------- */
  $$('[data-faq] .faq__q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      $$('[data-faq] .faq__q').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        b.nextElementSibling.hidden = true;
      });
      if (!open) { btn.setAttribute('aria-expanded', 'true'); btn.nextElementSibling.hidden = false; }
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
    tagEl.textContent = currentType ? 'Seguro ' + currentType : 'Cotação gratuita';
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

  /* ---------- Formulário de contato (provisório) ---------- */
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
