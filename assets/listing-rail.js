/* Лента каталога (12.11.2026, вынесено из section.js): стрелки, счётчик «1–6 из N», полоса прокрутки и догрузка всех моделей.
   Карточки рисует catalog.js. Подключается на страницах разделов, на главной и на страницах городов. Без зависимостей. */
(() => {
  'use strict';
  // Каталог: лента в две карточки по высоте, листается вправо. Карточки рисует catalog.js;
  // здесь — стрелки, счётчик и догрузка всех моделей (кнопки «Показать ещё» в ленте нет).
  const grid = document.getElementById('ek-grid'), more = document.getElementById('ek-more');
  if (!grid || !more) return;
  if (document.querySelector('#ek-listing[data-rows]')) return;   // 22.10: «LED-экраны» — обычная сетка по рядам и «Показать ещё» (catalog.js), без ленты
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
