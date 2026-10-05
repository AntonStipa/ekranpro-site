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
  grid.addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  let loading = false;
  new MutationObserver(() => { if (loading) loading = false; else grid.scrollLeft = 0; queue(); }).observe(grid, { childList: true });
  const loadAll = () => { const b = document.getElementById('ek-more-btn'); if (b) { loading = true; b.click(); } };
  new MutationObserver(loadAll).observe(more, { childList: true });
  loadAll(); queue();
})();
