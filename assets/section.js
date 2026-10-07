/* Продуктовая страница раздела: мелкие улучшения поверх готового HTML. Без скрипта страница читается целиком. */
(() => {
  'use strict';
  document.documentElement.classList.add('sx-js');

  // Шапка: на первом экране прозрачная, дальше — как на главной (эталон — renderHeader главной страницы).
  // Уходит вместе со страницей; после 2/3 высоты первого экрана выезжает закреплённой. Открытое меню показывает её сразу.
  const head = document.querySelector('#ekranpro-first-screen .ep1-header'), firstScreen = document.querySelector('.sx-hero');
  if (head && firstScreen && document.documentElement.classList.contains('sx-hdr')) {
    let docked = false, kb = false, frame = 0;
    const render = () => {
      frame = 0;
      const open = head.classList.contains('is-nav-open'), y = Math.max(0, scrollY);
      const dock = open || y > head.offsetHeight;
      if (!dock) kb = false;
      if (dock !== docked) {
        docked = dock;
        head.classList.remove('sx-shown', 'sx-anim');
        head.classList.toggle('sx-docked', dock);
        if (dock) { head.getBoundingClientRect(); head.classList.add('sx-anim'); }   // сначала скрытое состояние, потом переход
      }
      head.classList.toggle('sx-shown', dock && (open || kb || y >= firstScreen.offsetHeight * 2 / 3));
    };
    const ask = () => { if (!frame) frame = requestAnimationFrame(render); };
    const size = () => document.documentElement.style.setProperty('--sx-head-h', head.offsetHeight + 'px');   // фактическая высота шапки — отступ первого экрана
    size(); render();
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', () => { size(); ask(); });
    new MutationObserver(ask).observe(head, { attributes: true, attributeFilter: ['class'] });
    head.addEventListener('focusin', () => { if (docked && !head.classList.contains('sx-shown')) { kb = true; render(); } });
    head.addEventListener('focusout', () => setTimeout(() => { if (!head.contains(document.activeElement)) { kb = false; ask(); } }, 0));
  }

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

  // Варианты сцены: миниатюра в тексте показывает свою картинку слева.
  document.querySelectorAll('[data-vars]').forEach(box => {
    const scene = box.closest('.epp-scene'), imgs = scene ? [...scene.querySelectorAll('.epp-photo .sx-var-img')] : [], btns = [...box.querySelectorAll('button')];
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      imgs.forEach(im => im.classList.toggle('is-on', im.dataset.var === b.dataset.var));
    });
  });

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

  // Шаг пикселя: картинка из трёх зон пересчитывается по двум ползункам — расстоянию и шагу.
  // Логика и вид те же, что у картинки «как увидит зритель» в блоке «Подбор экрана» (podbor.js: pixelLook, drawTile):
  // k = расстояние (м) ÷ шаг (мм). При k ≥ 2 картинка чистая; от 2 до 1 поверх чистой картинки проступают светодиодные точки;
  // ниже 1 сама картинка становится крупнозернистой. Число точек в подборе задано на плитку 600 px —
  // здесь та же плотность на 600 px исходного фото.
  const pixelLook = k => {
    if (!(k > 0) || k >= 2) return { dots: 0, grid: 0 };
    let dots, grid;
    if (k < 1) { dots = Math.max(8, 107 * k); grid = Math.min(1, .255 + (1 - k) * 1.3); }
    else if (k < 1.4) { dots = 107 * Math.pow(170 / 107, (k - 1) / .4); grid = .255 - (k - 1) * .3375; }
    else { dots = 170 * Math.pow(2, (k - 1.4) / .6); grid = .12 - (k - 1.4) * .2; }
    return { dots, grid: Math.max(0, grid) };
  };
  document.querySelectorAll('[data-pitch]').forEach(box => {
    const frame = box.querySelector('.sx-pitch-frame'), img = frame && frame.querySelector('img');
    const inD = box.querySelector('[data-pitch-in="d"]'), inP = box.querySelector('[data-pitch-in="p"]');
    const outD = box.querySelector('[data-pitch-out="d"]'), outP = box.querySelector('[data-pitch-out="p"]');
    if (!img || !inD || !inP) return;
    const values = inP.dataset.values.split(',').map(Number), labels = inP.dataset.labels.split('|');
    const mk = () => document.createElement('canvas');
    const cv = mk(), ctx = cv.getContext('2d'), small = mk(), sctx = small.getContext('2d'), led = mk(), lctx = led.getContext('2d'), hole = mk(), hctx = hole.getContext('2d');
    cv.setAttribute('aria-hidden', 'true');
    const mips = [];                                             // исходное фото и его уменьшенные вдвое копии: честное усреднение при сильном уменьшении
    let raf = 0;
    const num = v => String(v).replace('.', ',');
    const fill = el => el.style.setProperty('--fill', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
    const draw = () => {
      raf = 0;
      const d = +inD.value, p = values[+inP.value];
      outD.textContent = d >= +inD.max && inD.dataset.maxLabel ? inD.dataset.maxLabel : num(Math.round(d * 10) / 10) + ' м';   // на правом краю — «10 м и более»
      outP.textContent = labels[+inP.value] + ' мм';
      inD.setAttribute('aria-valuetext', outD.textContent); inP.setAttribute('aria-valuetext', outP.textContent);
      fill(inD); fill(inP);
      if (!mips.length) return;
      const r = frame.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (!W || !H) return;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const look = pixelLook(d / p);
      ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      if (!look.dots) { ctx.drawImage(img, 0, 0, W, H); return; }
      // картинка в разрешении экрана: столько точек, сколько их приходится на всю ширину фото
      const bw = Math.max(8, Math.round(look.dots * img.naturalWidth / 600)), bh = Math.max(4, Math.round(bw * H / W));
      let m = mips[0];
      for (const c of mips) if (c.width >= bw) m = c;
      small.width = bw; small.height = bh; sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(m, 0, 0, m.naturalWidth || m.width, m.naturalHeight || m.height, 0, 0, bw, bh);   // у <img> width — размер на странице, нужен размер файла
      ctx.drawImage(d / p >= 1 ? img : small, 0, 0, W, H);
      if (look.grid > 0) {
        // слой светодиодов: каждая точка — кружок цвета своего пикселя на тёмной подложке
        const cell = W / bw;
        led.width = W; led.height = H;
        lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1; lctx.imageSmoothingEnabled = false;
        lctx.drawImage(small, 0, 0, bw, bh, 0, 0, W, H);
        lctx.globalCompositeOperation = 'lighter'; lctx.globalAlpha = .15; lctx.drawImage(small, 0, 0, bw, bh, 0, 0, W, H);   // точки на 15 % ярче картинки
        lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
        const t = Math.max(4, Math.ceil(cell * 2));              // шаблон «подложка с отверстием» рисуем крупнее и сжимаем до размера точки
        hole.width = t; hole.height = t;
        hctx.fillStyle = '#050505'; hctx.fillRect(0, 0, t, t);
        hctx.globalCompositeOperation = 'destination-out'; hctx.beginPath(); hctx.arc(t / 2, t / 2, t * .36, 0, Math.PI * 2); hctx.fill();
        hctx.globalCompositeOperation = 'source-over';
        lctx.save(); lctx.imageSmoothingEnabled = true; lctx.scale(cell / t, cell / t);
        lctx.fillStyle = lctx.createPattern(hole, 'repeat'); lctx.fillRect(0, 0, W * t / cell + t, H * t / cell + t);
        lctx.restore();
        ctx.globalAlpha = look.grid; ctx.drawImage(led, 0, 0); ctx.globalAlpha = 1;
      }
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const start = () => {
      if (mips.length || !img.naturalWidth) return;
      mips.push(img);
      let w = img.naturalWidth, h = img.naturalHeight, src = img;
      while (w > 24) {
        w = Math.ceil(w / 2); h = Math.ceil(h / 2);
        const c = mk(); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
        mips.push(c); src = c;
      }
      frame.appendChild(cv); draw();
    };
    inD.addEventListener('input', ask); inP.addEventListener('input', ask);
    img.addEventListener('load', start);
    if (img.complete) start();
    if (window.ResizeObserver) new ResizeObserver(ask).observe(frame); else addEventListener('resize', ask);
    draw();
  });

  // Этапы сеткой: высота карточки не меняется. Пояснение всегда занимает своё место; пока оно скрыто, название опущено
  // на его высоту (--sx-more), при наведении название поднимается, пояснение проявляется под ним.
  document.querySelectorAll('.sx-steps-grid').forEach(grid => {
    const items = [...grid.children];
    const size = () => items.forEach(li => { const m = li.querySelector('.sx-steps-more'); if (m) li.style.setProperty('--sx-more', m.offsetHeight + 'px'); });
    size(); addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  });

  // Сравнение трёх решений: два разделителя на одном кадре. Каждый доходит до любого края; встречаясь, один толкает другой.
  document.querySelectorAll('[data-tri]').forEach(fig => {
    const bars = [...fig.querySelectorAll('.sx-tri-bar')], tags = [...fig.querySelectorAll('.sx-tri-tag')];
    if (bars.length !== 2) return;
    const p = [100 / 3, 200 / 3];
    const apply = () => {
      fig.style.setProperty('--p1', p[0].toFixed(3) + '%'); fig.style.setProperty('--p2', p[1].toFixed(3) + '%');
      bars.forEach((b, i) => b.setAttribute('aria-valuenow', Math.round(p[i])));
      const w = fig.clientWidth, zone = [p[0], p[1] - p[0], 100 - p[1]];
      tags.forEach((t, i) => { const z = zone[i] / 100 * w; t.style.maxWidth = Math.max(0, z - 12) + 'px'; t.classList.toggle('is-off', z < 76); });   // в узкой зоне подпись переносится на две строки, в совсем узкой — прячется
    };
    const set = (i, v) => {
      v = Math.min(100, Math.max(0, v)); p[i] = v;
      if (i === 0 && p[1] < v) p[1] = v;
      if (i === 1 && p[0] > v) p[0] = v;
      apply();
    };
    const at = e => { const r = fig.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; };
    let drag = -1, off = 0;                                          // off — где внутри ручки её взяли: разделитель не прыгает под палец
    fig.addEventListener('pointerdown', e => {
      if (e.button) return;
      const bar = e.target.closest('.sx-tri-bar'), v = at(e);
      if (!bar && e.pointerType === 'touch') return;             // пальцем двигаем только за ручку: касание кадра остаётся прокруткой страницы
      drag = bar ? +bar.dataset.bar - 1 : p[0] === p[1] ? (v < p[0] ? 0 : 1) : Math.abs(v - p[0]) <= Math.abs(v - p[1]) ? 0 : 1;
      off = bar ? v - p[drag] : 0;
      fig.setPointerCapture(e.pointerId); set(drag, v - off); e.preventDefault();
    });
    fig.addEventListener('pointermove', e => { if (drag >= 0) set(drag, at(e) - off); });
    const drop = () => { drag = -1; };
    fig.addEventListener('pointerup', drop); fig.addEventListener('pointercancel', drop);
    bars.forEach((b, i) => b.addEventListener('keydown', e => {
      const k = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, Home: -100, End: 100 }[e.key];
      if (k) { set(i, p[i] + k); e.preventDefault(); }
    }));
    apply(); addEventListener('resize', apply);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
  });

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
