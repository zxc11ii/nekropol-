// Переключение фото в галерее карточки товара
document.addEventListener('click', function (e) {
  var t = e.target.closest('.nk-gal-thumb');
  if (!t) return;
  var gal = t.closest('.nk-gallery');
  var items = gal.querySelectorAll('.nk-gal-item');
  var i = +t.dataset.i;
  items.forEach(function (el, k) {
    el.classList.toggle('is-active', k === i);
    el.classList.toggle('nk-off', k !== i);
  });
  gal.querySelectorAll('.nk-gal-thumb').forEach(function (el) { el.classList.toggle('is-active', el === t); });
});

// Уведомление о cookie: показываем один раз, согласие храним в localStorage (в приватном режиме — просто показываем)
(function () {
  var box = document.getElementById('nkCookie');
  if (!box) return;
  var KEY = 'nk_cookie_ok';
  try { if (localStorage.getItem(KEY)) return; } catch (e) {}
  box.hidden = false;
  box.querySelector('.nk-cookie-btn').addEventListener('click', function () {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    box.hidden = true;
  });
})();

document.documentElement.classList.add('nk-js');

// 1. Шапка закреплена: место под неё держим отступом у body (высота меняется с шириной экрана)
(function () {
  var h = document.querySelector('.nk-header');
  if (!h) return;
  function sync() { document.body.style.paddingTop = h.offsetHeight + 'px'; }
  sync();
  window.addEventListener('load', sync);
  window.addEventListener('resize', sync);
  if (window.ResizeObserver) new ResizeObserver(sync).observe(h);
  function onScroll() { h.classList.toggle('nk-scrolled', (window.scrollY || document.documentElement.scrollTop) > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// 2. Мобильное меню
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.nk-mhead-menu');
  if (!btn) return;
  var nav = document.getElementById('nkMobileNav');
  var open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', open);
  nav.hidden = !open;
});

// 3. Согласие на обработку данных: обязательная галочка в каждой форме, без неё форма не отправляется
(function () {
  var html = '<input type="checkbox" class="nk-agree-box"> <span>Я согласен на <a href="/nekropol-/privacy-policy/" target="_blank">обработку персональных данных</a></span>';
  function add(form) {
    if (form.querySelector('.nk-agree')) return;
    var label = document.createElement('label');
    label.className = 'nk-agree';
    label.innerHTML = html;
    var submit = form.querySelector('[type=submit]');
    var anchor = submit && (submit.closest('table') || submit.closest('p') || submit);
    if (anchor && anchor.parentNode === form) form.insertBefore(label, anchor.tagName === 'TABLE' ? anchor.nextSibling : anchor);
    else if (submit) submit.parentNode.insertBefore(label, submit);
    else form.appendChild(label);
    var box = label.querySelector('input');
    function state() {
      form.classList.toggle('nk-agree-off', !box.checked);
      if (box.checked) label.classList.remove('nk-agree-error');
    }
    box.addEventListener('change', state);
    state();
  }
  function scan() { document.querySelectorAll('form.wpcf7-form, form.nk-order-form').forEach(add); }
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  // перехват раньше Contact Form 7 (фаза погружения на document)
  document.addEventListener('submit', function (e) {
    var box = e.target.querySelector && e.target.querySelector('.nk-agree-box');
    if (box && !box.checked) {
      e.preventDefault();
      e.stopImmediatePropagation();
      box.closest('.nk-agree').classList.add('nk-agree-error');
      box.focus();
    }
  }, true);
})();

// 4. Окно «Заказать» для карточек товаров
(function () {
  var modal = document.getElementById('nkOrder');
  if (!modal) return;
  var form = modal.querySelector('form'), title = modal.querySelector('h3'), msg = modal.querySelector('textarea'),
      status = modal.querySelector('.nk-order-status'), lastBtn = null;
  function open(btn) {
    lastBtn = btn;
    var p = btn.dataset.product || '', price = btn.dataset.price || '';
    title.textContent = 'Заказ: ' + p;
    msg.value = 'Интересует: ' + p + (price ? ' — ' + price : '');
    status.textContent = '';
    modal.hidden = false;
    document.body.classList.add('nk-modal-open');
    modal.querySelector('input').focus();
  }
  function close() {
    modal.hidden = true;
    document.body.classList.remove('nk-modal-open');
    if (lastBtn) lastBtn.focus();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.nk-order-open');
    if (b) { e.preventDefault(); open(b); return; }
    if (e.target === modal || e.target.closest('.nk-modal-close')) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.querySelector('[name=your-name]'), tel = form.querySelector('[name=tel-738]');
    if (!name.value.trim() || tel.value.replace(/\D/g, '').length < 6) {
      status.textContent = 'Укажите имя и телефон.';
      (name.value.trim() ? tel : name).focus();
      return;
    }
    var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /\.github\.io$/.test(location.hostname);  // макет: отправки нет
    if (local) {  // локальная копия: отправки нет
      status.textContent = 'Демо-версия: на сайте заявка уйдёт на nekropol159@yandex.ru. Сейчас можно позвонить: 202-02-52.';
      return;
    }
    var id = form.dataset.cf7, data = new FormData(form);
    data.append('_wpcf7', id); data.append('_wpcf7_unit_tag', 'wpcf7-f' + id + '-o1');
    data.append('_wpcf7_locale', 'ru_RU'); data.append('_wpcf7_version', '5.6.4');
    status.textContent = 'Отправляем…';
    fetch('/wp-json/contact-form-7/v1/contact-forms/' + id + '/feedback', { method: 'POST', body: data })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        status.textContent = r.status === 'mail_sent' ? 'Спасибо! Мы перезвоним в ближайшее время.' :
          'Не удалось отправить. Позвоните нам: 202-02-52.';
        if (r.status === 'mail_sent') form.reset();
      })
      .catch(function () { status.textContent = 'Не удалось отправить. Позвоните нам: 202-02-52.'; });
  });
})();

// 5. Плавное появление блоков при прокрутке
(function () {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sel = '.main-page-wrapper .elementor-top-section, .main-page-wrapper .nk-section, .nk-product, .nk-review, .nk-card, .nk-steps li, .nk-footer';
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('nk-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll(sel).forEach(function (el) {
    if (el.closest('.nk-header') || el.querySelector('rs-module')) return;  // шапку и слайдер не трогаем
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) return;  // то, что видно сразу, показываем без анимации
    el.classList.add('nk-reveal');
    io.observe(el);
  });
})();

// 6. Плавающие кнопки поднимаются над плашкой cookie, пока она открыта
(function () {
  var c = document.getElementById('nkCookie');
  if (!c) return;
  function sync() { document.documentElement.style.setProperty('--nk-cookie-h', c.hidden ? '0px' : c.offsetHeight + 16 + 'px'); }
  new MutationObserver(sync).observe(c, { attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('resize', sync);
  setTimeout(sync, 50);
})();


// 7. Просмотр фото на весь экран (карточки каталога и галерея товара): стрелки, Esc, клик по фону
(function () {
  var lb, img, cap, prev, next, list = [], pos = 0, title = '', back = null;
  var ico = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
  };
  function build() {
    lb = document.createElement('div');
    lb.className = 'nk-lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Просмотр фото');
    lb.innerHTML = '<button type="button" class="nk-lb-btn nk-lb-close" aria-label="Закрыть">' + ico.x + '</button>' +
      '<button type="button" class="nk-lb-btn nk-lb-prev" aria-label="Предыдущее фото">' + ico.l + '</button>' +
      '<figure class="nk-lb-figure"><img class="nk-lb-img" alt=""><figcaption class="nk-lb-cap"></figcaption></figure>' +
      '<button type="button" class="nk-lb-btn nk-lb-next" aria-label="Следующее фото">' + ico.r + '</button>';
    document.body.appendChild(lb);
    img = lb.querySelector('.nk-lb-img'); cap = lb.querySelector('.nk-lb-cap');
    prev = lb.querySelector('.nk-lb-prev'); next = lb.querySelector('.nk-lb-next');
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.nk-lb-close') || e.target === lb) close();
      else if (e.target.closest('.nk-lb-prev')) show(pos - 1);
      else if (e.target.closest('.nk-lb-next')) show(pos + 1);
    });
  }
  function show(i) {
    pos = (i + list.length) % list.length;
    img.src = list[pos].src; img.alt = list[pos].alt;
    cap.innerHTML = '';
    cap.appendChild(document.createTextNode(title));
    if (list.length > 1) { var s = document.createElement('small'); s.textContent = (pos + 1) + ' из ' + list.length + ' · ' + list[pos].alt; cap.appendChild(s); }
    prev.hidden = next.hidden = list.length < 2;
  }
  function open(a) {
    try { list = JSON.parse(a.dataset.images || '[]'); } catch (e) { list = []; }
    if (!list.length) return false;
    if (!lb) build();
    title = a.dataset.title || ''; back = a;
    show(+a.dataset.index || 0);
    lb.hidden = false; document.body.classList.add('nk-modal-open');
    lb.querySelector('.nk-lb-close').focus();
    return true;
  }
  function close() {
    lb.hidden = true; document.body.classList.remove('nk-modal-open');
    if (back) back.focus();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.nk-zoom');
    if (a && open(a)) e.preventDefault();
  });
  document.addEventListener('keydown', function (e) {
    if (!lb || lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(pos - 1);
    else if (e.key === 'ArrowRight') show(pos + 1);
  });
})();
