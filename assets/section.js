/* Продуктовая страница раздела: мелкие улучшения поверх готового HTML. Без скрипта страница читается целиком. */
(() => {
  'use strict';
  document.documentElement.classList.add('sx-js');

  // Первый экран: экран на фото — посередине между правым краем слова «светодиодные» и правым краем окна.
  const hero = document.querySelector('.sx-hero'), heroImg = hero && hero.querySelector('.sx-hero-img'), h1 = hero && hero.querySelector('h1');
  if (heroImg && h1) {
    const SHOT = .7377, RATIO = 2836 / 1024;                    // центр экрана на фото и пропорции фото
    const place = () => {
      if (matchMedia('(max-width:680px)').matches) { heroImg.style.removeProperty('--sx-x'); return; }
      const box = hero.getBoundingClientRect(), r = document.createRange();
      let right = 0;
      h1.childNodes.forEach(n => { if (n.nodeType === 3) { r.selectNodeContents(n); right = Math.max(right, r.getBoundingClientRect().right); } });
      const iw = Math.max(box.width, box.height * RATIO);         // фото вписано по высоте, пока оно шире окна
      const x = Math.min(0, Math.max(box.width - iw, (right - box.left + box.width) / 2 - iw * SHOT));
      heroImg.style.setProperty('--sx-x', x.toFixed(1) + 'px');
    };
    place(); addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  }
  // «Перейти в каталог» внутри закреплённого блока технологий: браузерный переход по якорю работает сам,
  // здесь только снимаем фокус с кнопки сцены, чтобы блок не вернул прокрутку к себе.
  document.querySelectorAll('#ep-products-compare a[href^="#"]').forEach(a => a.addEventListener('click', () => a.blur()));

  // Ползунок сравнения «обычный / профессиональный экран» в сцене технологий.
  document.querySelectorAll('.sx-cmp').forEach(fig => {
    const range = fig.querySelector('.sx-cmp-range');
    if (!range) return;
    const set = () => fig.style.setProperty('--pos', range.value + '%');
    range.addEventListener('input', set);
    // жесты по ползунку не должны запускать паузы прокрутки закреплённого блока
    ['touchstart', 'touchmove', 'pointerdown'].forEach(t => range.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    set();
  });

  // Справка: блок высотой в экран, полный текст открывается кнопкой. Без скрипта текст показан целиком.
  const about = document.getElementById('about'), moreBtn = about && about.querySelector('.sx-about-more');
  if (moreBtn) {
    const labels = moreBtn.querySelectorAll('.ep-link__label > span');
    moreBtn.hidden = false;
    moreBtn.addEventListener('click', () => {
      const open = about.classList.toggle('is-open');
      moreBtn.setAttribute('aria-expanded', String(open));
      labels.forEach(l => { l.textContent = open ? moreBtn.dataset.less : moreBtn.dataset.more; });
      if (!open) about.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }

  // Этапы установки: блок закреплён, каждый шаг прокрутки открывает следующий этап (на узких экранах и без анимаций — обычный список).
  const flow = document.querySelector('.sx-flow'), flowItems = flow ? [...flow.querySelectorAll('.sx-cards li')] : [];
  if (flowItems.length) {
    const count = flow.querySelector('.sx-flow-count b'), pin = flow.querySelector('.sx-flow-pin');
    let shown = -1, tick = false;
    const draw = () => {
      tick = false;
      // последний этап держится два шага: иначе он уезжает раньше, чем его успевают прочитать
      const cs = getComputedStyle(pin), room = cs.position === 'sticky' ? flow.offsetHeight - pin.offsetHeight : 0;   // закрепление включает CSS; без него показаны все этапы
      const n = room > 0 ? Math.min(flowItems.length, 1 + Math.max(0, Math.floor((parseFloat(cs.top) - flow.getBoundingClientRect().top) / (room / (flowItems.length + 1))))) : flowItems.length;
      if (n === shown) return;
      shown = n;
      flowItems.forEach((li, i) => { li.classList.toggle('is-on', i < n); li.classList.toggle('is-last', i === n - 1); });
      flow.style.setProperty('--sx-flow-n', n);
      if (count) count.textContent = String(n).padStart(2, '0');
    };
    const ask = () => { if (!tick) { tick = true; requestAnimationFrame(draw); } };
    draw(); addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask);
  }

  // Каталог: лента в две карточки по высоте, листается вправо. Карточки рисует catalog.js;
  // здесь — стрелки, счётчик и догрузка всех моделей (кнопки «Показать ещё» в ленте нет).
  const grid = document.getElementById('ek-grid'), more = document.getElementById('ek-more');
  if (!grid || !more) return;
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8L22 12L18 16M2 12H22" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const rail = document.createElement('div');
  rail.className = 'sx-rail';
  rail.innerHTML = `<p class="sx-rail-count" aria-live="polite"></p><div class="sx-rail-bar" aria-hidden="true"><i></i></div><div class="sx-rail-btns"><button type="button" aria-label="Предыдущие модели">${ARROW}</button><button type="button" aria-label="Следующие модели">${ARROW}</button></div>`;
  grid.after(rail);
  const count = rail.querySelector('.sx-rail-count'), bar = rail.querySelector('.sx-rail-bar i'), [prev, next] = rail.querySelectorAll('button');
  const step = () => { const c = grid.querySelector('.ek-card'); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(grid).columnGap || 0) : grid.clientWidth; };
  let raf = 0;
  const update = () => {
    raf = 0;
    const n = grid.querySelectorAll('.ek-card').length;
    rail.hidden = !n;
    if (!n) return;
    const max = grid.scrollWidth - grid.clientWidth, x = Math.min(grid.scrollLeft, max), w = step();
    const col = Math.round(x / w), cols = Math.max(1, Math.round(grid.clientWidth / w));
    count.innerHTML = `<b>${col * 2 + 1}–${Math.min(n, (col + cols) * 2)}</b> из ${n}`;
    prev.disabled = x <= 2; next.disabled = x >= max - 2;
    rail.querySelector('.sx-rail-btns').hidden = max <= 2;
    bar.style.width = (grid.clientWidth / grid.scrollWidth * 100) + '%';
    bar.style.left = (x / grid.scrollWidth * 100) + '%';
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  prev.addEventListener('click', () => grid.scrollBy({ left: -grid.clientWidth - 1, behavior: 'smooth' }));
  next.addEventListener('click', () => grid.scrollBy({ left: grid.clientWidth + 1, behavior: 'smooth' }));
  // Полоса под лентой: ползунок тянется мышью или пальцем, клик по свободному месту листает на один экран.
  const track = rail.querySelector('.sx-rail-bar');
  let drag = null;
  track.addEventListener('pointerdown', e => {
    if (e.button) return;
    const t = bar.getBoundingClientRect();
    if (e.clientX < t.left || e.clientX > t.right) {       // мимо ползунка — лист на экран в сторону клика
      grid.scrollBy({ left: (e.clientX < t.left ? -1 : 1) * (grid.clientWidth + 1), behavior: 'smooth' });
      return;
    }
    drag = { x: e.clientX, left: grid.scrollLeft, k: grid.scrollWidth / track.getBoundingClientRect().width };
    track.classList.add('is-drag'); track.setPointerCapture(e.pointerId);
    grid.style.scrollSnapType = 'none'; grid.style.scrollBehavior = 'auto';   // пока тянем, лента идёт за рукой без прилипания
    e.preventDefault();
  });
  track.addEventListener('pointermove', e => { if (drag) grid.scrollLeft = drag.left + (e.clientX - drag.x) * drag.k; });
  const drop = () => {
    if (!drag) return;
    drag = null; track.classList.remove('is-drag');
    const w = step(), to = Math.round(grid.scrollLeft / w) * w;   // довести до целой карточки
    grid.style.scrollBehavior = '';
    grid.scrollTo({ left: to, behavior: 'smooth' });
    setTimeout(() => { grid.style.scrollSnapType = ''; }, 450);
  };
  track.addEventListener('pointerup', drop); track.addEventListener('pointercancel', drop);
  grid.addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  let loading = false;
  new MutationObserver(() => { if (loading) loading = false; else grid.scrollLeft = 0; queue(); }).observe(grid, { childList: true });
  const loadAll = () => { const b = document.getElementById('ek-more-btn'); if (b) { loading = true; b.click(); } };
  new MutationObserver(loadAll).observe(more, { childList: true });
  loadAll(); queue();
})();
