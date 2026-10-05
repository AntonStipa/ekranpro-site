/* Каталог ЭкранПро: фильтры листинга, сравнение, диалог заявки. Без зависимостей. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const wordFor = n => (n % 10 === 1 && n % 100 !== 11) ? 'модель' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'модели' : 'моделей';
  const BASE = document.documentElement.dataset.base || '';
  const FORM_ENDPOINT = ''; // адрес обработчика формы (Formspree / свой бэкенд); пусто = демонстрационный режим

  /* ---------- сравнение (общее для всех страниц) ---------- */
  const CMP_KEY = 'ek-compare';
  const cmpGet = () => { try { return JSON.parse(localStorage.getItem(CMP_KEY) || '[]'); } catch (e) { return []; } };
  const cmpSet = v => { try { localStorage.setItem(CMP_KEY, JSON.stringify(v.slice(0, 4))); } catch (e) {} };

  /* ---------- диалог заявки ---------- */
  const dialog = $('#cat-order-dialog');
  if (dialog) {
    const form = $('#cat-order-form'), result = $('#cat-form-result');
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-order],[data-quote]');
      if (!t) return;
      e.preventDefault();
      const name = t.dataset.order || t.dataset.quote || '';
      const pf = form.elements.product; if (pf) { pf.value = name; pf.closest('label').hidden = !name; }
      result.hidden = true; form.hidden = false;
      dialog.showModal(); document.documentElement.style.overflow = 'hidden';
      setTimeout(() => form.elements.name && form.elements.name.focus(), 50);
    });
    const close = () => { dialog.close(); document.documentElement.style.overflow = ''; };
    $$('[data-close-dialog]', dialog).forEach(b => b.addEventListener('click', close));
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
    dialog.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.contact || !data.contact.trim()) { form.elements.contact.focus(); return; }
      let ok = true;
      if (FORM_ENDPOINT) {
        try { const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...data, page: location.href }) }); ok = r.ok; } catch (err) { ok = false; }
      }
      result.textContent = ok ? 'Заявка принята. Инженер пришлёт расчёт с комплектацией в течение рабочего дня.' : 'Не удалось отправить. Позвоните +7 (499) 350-27-45 или напишите zakaz@ekranpro.ru.';
      result.hidden = false; form.hidden = true;
    });
  }

  /* ---------- слайдер по наведению (карточки в листинге и «похожие») ---------- */
  function bindSliders(grid) {
      $$('.ek-img[data-frames]', grid).forEach(box => {
      const n = +box.dataset.frames; if (n < 2) return;
      const imgs = $$('.ek-frames img', box), dots = $$('.ek-dots i', box);
      const set = i => { imgs.forEach((im, k) => im.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
      const card = box.closest('.ek-card'); // растянутая ссылка карточки перекрывает фото, поэтому слушаем движение на всей карточке
      card.addEventListener('mousemove', e => { const r = box.getBoundingClientRect(); if (e.clientY < r.top || e.clientY > r.bottom) return; set(Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * n)))); });
      card.addEventListener('mouseleave', () => set(0));
      let cur = 0; box.addEventListener('touchend', e => { if (e.target.closest('.ek-cmp')) return; cur = (cur + 1) % n; set(cur); }, { passive: true });
    });
  }
  bindSliders(document);

  /* ---------- листинг ---------- */
  const root = $('#ek-listing');
  if (root) {
    const DATA = JSON.parse($('#ek-data').textContent);
    const P = DATA.products, SECTIONS = DATA.sections, APPS = DATA.apps;
    const inRange = (v, a, b) => v != null && v > a && v <= b;
    const GROUP = root.dataset.group || 'led';
    const LED_FILTERS = [
      { key: 'section', type: 'check', title: 'Раздел', opts: () => SECTIONS.map(s => [s.slug, s.name]), test: (p, v) => p.section === v },
      { key: 'env', type: 'check', title: 'Среда', opts: () => [['out', 'Улица'], ['in', 'Помещение']], test: (p, v) => p.env === v },
      { key: 'kind', type: 'check', title: 'Тип экрана', opts: () => [['cabinet', 'Кабинетные'], ['mesh', 'Медиафасад'], ['flex', 'Гибкие']], test: (p, v) => p.kind === v },
      { key: 'nit', type: 'preset', title: 'Яркость, нит', hint: 'В помещении достаточно 600–1 500 нит, на улице нужно от 5 000',
        opts: () => [['0', 'до 1 500', 0, 1500], ['1', '1 500–5 000', 1500, 5000], ['2', 'от 5 000', 5000, 999999]], test: (p, v, o) => inRange(p.nit, o[2], o[3]) },
      { key: 'pitch', type: 'preset', title: 'Шаг пикселя, мм', hint: 'Расстояние между пикселями. До 1,5 мм — переговорные и диспетчерские, 1,5–2,5 — ресепшн и витрины, 2,5–5 — сцены и залы, от 5 — улица и стадионы',
        opts: () => [['0', '≤1,5', 0, 1.5], ['1', '1,5–2,5', 1.5, 2.5], ['2', '2,5–5', 2.5, 5], ['3', '5–10', 5, 10], ['4', '>10', 10, 999]], test: (p, v, o) => inRange(p.pitch, o[2], o[3]) },
      { key: 'pixel', type: 'check', title: 'Тип пикселя', opts: () => DATA.pixelTypes.map(b => [b, b]), test: (p, v) => p.pixelType === v },
      { key: 'svc', type: 'check', title: 'Обслуживание', opts: () => [['front', 'Переднее'], ['back', 'Заднее']], test: (p, v) => p.svc === v || p.svc === 'both' },
      { key: 'price', type: 'range', title: 'Цена, ₽ с НДС', ph: ['от 50 000', 'до 2 500 000'] },
      { key: 'apps', hidden: true, type: 'check', title: 'Применение', opts: () => Object.keys(APPS).map(a => [a, APPS[a]]), test: (p, v) => p.apps.includes(v) },
    ];
    const LCD_WALL = ['lcd-videosteny', 'lcd-paneli-dlya-videosten'];
    // состав и порядок фильтров LCD: общий раздел ('') и каждый продукт отдельно
    const LCD_SIDEBAR = {
      '': ['section', 'diag', 'brand', 'layout', 'bezel', 'nit', 'sensor', 'res', 'mode', 'price'],
      'lcd-videosteny': ['diag', 'brand', 'layout', 'bezel', 'nit', 'res', 'mode', 'price'],
      'lcd-paneli-dlya-videosten': ['diag', 'brand', 'bezel', 'nit', 'res', 'mode', 'price'],
      'informaczionnye-paneli': ['diag', 'brand', 'nit', 'res', 'mode', 'price'],
      'professionalnye-displei': ['diag', 'brand', 'nit', 'res', 'mode', 'price'],
      'interaktivnye-paneli': ['diag', 'brand', 'nit', 'sensor', 'res', 'mode', 'price'],
    };
    const LCD_FILTERS = [
      { key: 'section', type: 'check', title: 'Продукт', opts: () => SECTIONS.map(s => [s.slug, s.name]), test: (p, v) => p.section === v },
      { key: 'apps', hidden: true, type: 'check', title: 'Применение', opts: () => Object.keys(APPS).map(a => [a, APPS[a]]), test: (p, v) => p.apps.includes(v) },
      { key: 'brand', type: 'check', title: 'Бренд', opts: () => DATA.brands.map(b => [b, b]), test: (p, v) => p.brand === v },
      { key: 'diag', type: 'preset', title: 'Диагональ панели, ″', opts: () => [['0', 'до 43', 0, 43], ['1', '46–55', 43, 55], ['2', '65–75', 55, 75], ['3', 'от 86', 75, 999]], test: (p, v, o) => inRange(p.diag, o[2], o[3]) },
      { key: 'layout', type: 'check', title: 'Конфигурация стены', opts: () => DATA.layouts.map(l => [l, l]), test: (p, v) => p.layout === v },
      { key: 'bezel', type: 'preset', title: 'Шов видеостены, мм', hint: 'Суммарная ширина рамок между соседними панелями. До 1 мм — диспетчерские и переговорные, 1,7–3,5 — ритейл и навигация',
        opts: () => [['0', 'до 1', 0, 1], ['1', '1–2', 1, 2], ['2', 'от 2', 2, 99]], test: (p, v, o) => p.bezel != null && inRange(p.bezel, o[2], o[3]) },
      { key: 'nit', type: 'preset', title: 'Яркость, нит', hint: 'Для офиса 500 нит, для витрины у окна от 700', opts: () => [['0', 'до 500', 0, 500], ['1', 'от 650', 500, 99999]], test: (p, v, o) => inRange(p.nit, o[2], o[3]) },
      { key: 'sensor', type: 'check', title: 'Тип сенсора', hint: 'Только для интерактивных панелей. Инфракрасный — касание любым предметом, ёмкостный — как в смартфоне, стекло без рамки', opts: () => [['ir', 'Инфракрасный'], ['pcap', 'Ёмкостный']], test: (p, v) => p.sensor === v },
      { key: 'res', type: 'check', title: 'Разрешение', opts: () => [['4k', '4K'], ['fhd', 'Full HD']], test: (p, v) => v === '4k' ? /3840 × 2160/.test(p.res || '') : /1920 × 1080/.test(p.res || '') },
      { key: 'mode', type: 'check', title: 'Режим работы', opts: () => [['24/7', '24/7'], ['18/7', '18/7'], ['16/7', '16/7'], ['12/7', '12/7']], test: (p, v) => (p.mode || (LCD_WALL.includes(p.section) ? '24/7' : '')) === v },
      { key: 'price', type: 'range', title: 'Цена, ₽', ph: ['от 90 000', 'до 5 000 000'] },
    ];
    const FILTERS = GROUP === 'lcd' ? LCD_FILTERS : LED_FILTERS;
    const CHIP = { kind: 'Тип экрана', section: 'Раздел', apps: 'Применение', env: 'Среда', pitch: 'Шаг', nit: 'Яркость', price: 'Цена', series: 'Класс', brand: 'Бренд', svc: 'Обслуживание', pixel: 'Пиксель', diag: 'Диагональ', layout: 'Конфигурация', bezel: 'Шов', res: 'Разрешение', mode: 'Режим', sensor: 'Сенсор' };
    // по умолчанию: сначала модели с фото, внутри — от дешёвых к дорогим
    const noPhoto = p => /\.svg$/.test(p.photo || '') ? 1 : 0;
    const byPrice = (a, b) => (noPhoto(a) - noPhoto(b)) || ((a.price || 1e12) - (b.price || 1e12));
    const SORTS = GROUP === 'lcd' ? [
      ['default', 'цена: сначала дешевле', byPrice],
      ['section', 'по разделу и диагонали', (a, b) => (a.sectionOrder - b.sectionOrder) || ((a.diag || 0) - (b.diag || 0)) || ((a.price || 1e12) - (b.price || 1e12))],
      ['price-desc', 'цена: сначала дороже', (a, b) => (b.price || 0) - (a.price || 0)],
      ['diag-asc', 'диагональ: от меньшей', (a, b) => (a.diag || 0) - (b.diag || 0)],
      ['diag-desc', 'диагональ: от большей', (a, b) => (b.diag || 0) - (a.diag || 0)],
      ['bezel-asc', 'шов: от тонкого', (a, b) => (a.bezel ?? 99) - (b.bezel ?? 99)],
    ] : [
      ['default', 'цена: сначала дешевле', byPrice],
      ['section', 'по разделу и шагу', (a, b) => (a.sectionOrder - b.sectionOrder) || ((a.pitch || 99) - (b.pitch || 99)) || ((a.price || 0) - (b.price || 0))],
      ['price-desc', 'цена: сначала дороже', (a, b) => (b.price || 0) - (a.price || 0)],
      ['pitch-asc', 'шаг пикселя: от мелкого', (a, b) => (a.pitch || 99) - (b.pitch || 99)],
      ['pitch-desc', 'шаг пикселя: от крупного', (a, b) => (b.pitch || 0) - (a.pitch || 0)],
      ['nit-desc', 'яркость: сначала ярче', (a, b) => (b.nit || 0) - (a.nit || 0)],
    ];
    const secOrder = Object.fromEntries(SECTIONS.map((s, i) => [s.slug, i]));
    P.forEach(p => { p.sectionOrder = secOrder[p.section] ?? 99; });

    const state = { sel: {}, pmin: '', pmax: '', q: '', sort: 'default', shown: 24, view: 'grid' };
    const fresh = s => { s.sel = {}; FILTERS.forEach(f => { if (f.type !== 'range') s.sel[f.key] = new Set(); }); s.pmin = ''; s.pmax = ''; s.q = ''; };
    fresh(state);
    // пресеты из страницы раздела и из URL (?section=…&app=…)
    const lockedSection = root.dataset.section || '';
    // исходное состояние раздела: сам раздел; у панелей для видеостен сразу отмечен режим 24/7
    const preset = s => { if (lockedSection) s.sel.section.add(lockedSection); if (GROUP === 'lcd' && lockedSection === 'lcd-paneli-dlya-videosten') s.sel.mode.add('24/7'); };
    preset(state);
    const qs = new URLSearchParams(location.search);
    if (qs.get('app') && APPS[qs.get('app')]) state.sel.apps.add(qs.get('app'));
    if (qs.get('env')) state.sel.env.add(qs.get('env'));
    if (qs.get('q')) state.q = qs.get('q');

    const passes = (p, s, skip) => {
      for (const f of FILTERS) {
        if (f.key === skip) continue;
        if (f.type === 'range') { if (s.pmin !== '' && (p.price || 0) < +s.pmin) return false; if (s.pmax !== '' && (p.price || 0) > +s.pmax) return false; continue; }
        const sel = s.sel[f.key]; if (!sel || !sel.size) continue;
        const opts = f.opts();
        if (![...sel].some(v => f.test(p, v, opts.find(o => o[0] === v)))) return false;
      }
      if (s.q) { const q = s.q.toLowerCase().replace(',', '.'); if (![p.name, p.sku, String(p.pitch), p.model || ''].some(t => String(t).toLowerCase().replace(',', '.').includes(q))) return false; }
      return true;
    };
    const results = s => { const r = P.filter(p => passes(p, s)); const srt = SORTS.find(x => x[0] === s.sort) || SORTS[0]; r.sort(srt[2]); return r; };
    const countFor = (s, f, o) => P.filter(p => passes(p, s, f.key) && f.test(p, o[0], o)).length;

    const visibleFilters = () => FILTERS.filter(f => !(f.key === 'section' && lockedSection));
    const sidebarFilters = () => { const vf = visibleFilters().filter(f => !f.hidden); if (GROUP !== 'lcd') return vf; return (LCD_SIDEBAR[lockedSection] || LCD_SIDEBAR['']).map(k => vf.find(f => f.key === k)).filter(Boolean); };
    function filterHTML(s) {
      return sidebarFilters().map(f => {
        let inner = '';
        if (f.type === 'check') inner = f.opts().map(o => { const n = countFor(s, f, o); const on = s.sel[f.key].has(o[0]); return `<label class="ek-chk ${n === 0 ? 'off' : ''}"><input type="checkbox" data-k="${f.key}" data-v="${o[0]}" ${on ? 'checked' : ''} ${n === 0 && !on ? 'disabled' : ''}><span>${o[1]}</span><span class="c ek-num">${n}</span></label>`; }).join('');
        else if (f.type === 'preset') inner = `<div class="ek-presets">${f.opts().map(o => { const n = countFor(s, f, o); const on = s.sel[f.key].has(o[0]); return `<button type="button" data-k="${f.key}" data-v="${o[0]}" aria-pressed="${on}" ${n === 0 && !on ? 'disabled' : ''}>${o[1]} <span class="ek-num" style="opacity:.55">${n}</span></button>`; }).join('')}</div>`;
        else inner = `<div class="ek-range"><input type="number" inputmode="numeric" data-k="pmin" placeholder="${f.ph[0]}" value="${s.pmin}" aria-label="Цена от"><span>—</span><input type="number" inputmode="numeric" data-k="pmax" placeholder="${f.ph[1]}" value="${s.pmax}" aria-label="Цена до"></div>`;
        return `<div class="ek-fgroup"><h3>${f.title}${f.hint ? `<span class="ek-hint" title="${f.hint}">?</span>` : ''}</h3>${inner}</div>`;
      }).join('') + `<button type="button" class="ek-reset" data-reset>Сбросить все фильтры</button>`;
    }
    function bindFilters(container, s, after) {
      $$('input[type=checkbox]', container).forEach(el => el.addEventListener('change', () => { el.checked ? s.sel[el.dataset.k].add(el.dataset.v) : s.sel[el.dataset.k].delete(el.dataset.v); after(); }));
      $$('.ek-presets button', container).forEach(el => el.addEventListener('click', () => { const S = s.sel[el.dataset.k]; S.has(el.dataset.v) ? S.delete(el.dataset.v) : S.add(el.dataset.v); after(); }));
      $$('input[type=number]', container).forEach(el => el.addEventListener('input', () => { s[el.dataset.k] = el.value; after(true); }));
      const r = $('[data-reset]', container); if (r) r.addEventListener('click', () => { fresh(s); preset(s); const q = $('#ek-q'); if (q) q.value = ''; after(); });
    }
    function chipsList() {
      const out = [];
      visibleFilters().forEach(f => {
        if (f.type === 'range') { if (state.pmin !== '' || state.pmax !== '') out.push({ label: CHIP[f.key], val: (state.pmin !== '' ? 'от ' + fmt(+state.pmin) : '') + (state.pmax !== '' ? ' до ' + fmt(+state.pmax) : '') + ' ₽', fn: () => { state.pmin = ''; state.pmax = ''; } }); return; }
        const opts = f.opts();
        state.sel[f.key].forEach(v => { const o = opts.find(x => x[0] === v); out.push({ label: CHIP[f.key], val: o ? o[1] : v, fn: () => state.sel[f.key].delete(v) }); });
      });
      return out;
    }
    const BADGE = { 'ulichnye-ekrany': 'Уличный', 'interernye-ekrany': 'Интерьерный', 'gibkie-ekrany': 'Гибкий', 'mediafasady': 'Медиафасад', 'prokatnye-ekrany': 'Прокатный', 'tablo-navigatsii': 'Табло' };
    const badge = p => GROUP === 'lcd' ? (p.section === 'interaktivnye-paneli' ? 'Сенсорная' : p.layout ? 'Видеостена ' + p.layout : (p.mode || 'LCD')) : (BADGE[p.section] || p.sectionName);
    const ARROW = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8L22 12L18 16M2 12H22" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const ARW = cls => `<span class="ek-arw" aria-hidden="true">${ARROW.replace('<svg', `<svg class="${cls}-out"`)}${ARROW.replace('<svg', `<svg class="${cls}-in"`)}</span>`;
    function cardHTML(p) {
      const url = `${BASE}/catalog/tovar/${p.slug}/`;
      const unit = p.priceUnit === 'стена' ? 'за видеостену' : p.priceUnit === 'шт' ? (GROUP === 'lcd' ? 'за панель' : 'за табло, с НДС') : 'за м², с НДС';
      const price = p.price ? `<b class="ek-num">${p.priceUnit === 'м²' ? 'от ' : ''}${fmt(p.price)} ₽</b><span>${unit}</span>` : `<b>по запросу</b>`;
      const cmp = cmpGet().includes(p.sku) ? 'checked' : '';
      const frames = (p.frames && p.frames.length ? p.frames : [p.photo]);
      const imgs = frames.map((f, i) => `<img src="${BASE}/${f}" alt="${i ? '' : p.name}" loading="lazy" width="480" height="360" class="${i ? '' : 'on'}" ${i ? 'aria-hidden="true"' : ''}>`).join('');
      const dots = frames.length > 1 ? `<div class="ek-dots" aria-hidden="true">${frames.map((f, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : '';
      return `<article class="ek-card" data-sku="${p.sku}">
        <div class="ek-img" data-frames="${frames.length}"><div class="ek-frames">${imgs}</div>${dots}${p.section === 'interaktivnye-paneli' ? '<span class="ek-touch" title="Сенсорный экран" aria-label="Сенсорный экран"></span>' : ''}<span class="ek-badges">${(GROUP !== 'lcd' && p.badges || [badge(p)]).map(b => `<span class="ek-badge">${b}</span>`).join('')}</span><label class="ek-cmp"><input type="checkbox" data-cmp="${p.sku}" ${cmp}>Сравнить</label></div>
        <div class="ek-body"><div><h3><a href="${url}">${p.name}</a></h3><div class="ek-sku">${p.sku}</div></div>
        <dl class="ek-specs">${p.specs.map(s => `<div><dt>${s[0]}</dt><dd class="ek-num">${s[1]}</dd></div>`).join('')}</dl>
        <div class="ek-price"><span class="pl">Цена</span><span class="val">${price}</span></div></div>
        <div class="ek-actions"><button type="button" class="ek-order" data-order="${p.name} (${p.sku})"><span class="lbl">Заказать</span>${ARW('ek-o')}</button><a class="ek-details" href="${url}"><span class="ek-lbl2"><span class="base">Подробнее</span><span class="hov" aria-hidden="true">Подробнее</span></span>${ARW('ek-d')}<span class="ek-line" aria-hidden="true"><i class="out"></i><i class="in"></i></span></a></div></article>`;
    }
    function render(keepFocus) {
      const r = results(state), n = r.length;
      $('#ek-count').textContent = n; $('#ek-count-word').textContent = wordFor(n);
      const shown = r.slice(0, state.shown);
      const grid = $('#ek-grid'); grid.className = 'ek-grid' + (state.view === 'list' ? ' list' : '');
      grid.innerHTML = n ? shown.map(cardHTML).join('') : `<div class="ek-empty" style="grid-column:1/-1">По этим условиям моделей нет. <button type="button" data-reset-all>Сбросить фильтры</button> или оставьте заявку — подберём под задачу.</div>`;
      const more = $('#ek-more');
      more.innerHTML = n > shown.length ? `<button type="button" class="ek-btn ek-btn--outline ek-btn--center" id="ek-more-btn" style="min-width:260px">Показать ещё ${Math.min(24, n - shown.length)}</button><span>Показано ${shown.length} из ${n}</span>` : (n ? `<span>Показано ${shown.length} из ${n}</span>` : '');
      const mb = $('#ek-more-btn'); if (mb) mb.addEventListener('click', () => { state.shown += 24; render(); });
      bindSliders(grid);
      $$('[data-reset-all]', grid).forEach(b => b.addEventListener('click', () => { fresh(state); preset(state); $('#ek-q').value = ''; state.shown = 24; render(); }));
      $$('[data-cmp]', grid).forEach(el => el.addEventListener('change', () => { let c = cmpGet().filter(x => x !== el.dataset.cmp); if (el.checked) c.push(el.dataset.cmp); cmpSet(c); renderCmp(); }));
      const chips = chipsList(), ce = $('#ek-chips');
      ce.innerHTML = chips.length ? chips.map((c, i) => `<span class="ek-chip"><small>${c.label}:</small> ${c.val}<button type="button" data-chip="${i}" aria-label="Убрать фильтр ${c.val}">×</button></span>`).join('') + `<button type="button" class="ek-clear" data-clear>Сбросить всё</button>` : '';
      $$('[data-chip]', ce).forEach(b => b.addEventListener('click', () => { chips[+b.dataset.chip].fn(); state.shown = 24; render(); }));
      $$('[data-clear]', ce).forEach(b => b.addEventListener('click', () => { fresh(state); preset(state); $('#ek-q').value = ''; state.shown = 24; render(); }));
      const fc = $('#ek-fbtn-count'); if (fc) fc.textContent = chips.length ? `· ${chips.length}` : '';
      const fb = $('#ek-filter-body'); const focus = document.activeElement; const sel = focus && focus.selectionStart;
      fb.innerHTML = filterHTML(state); bindFilters(fb, state, soft => { state.shown = 24; render(soft); });
      if (keepFocus && focus && focus.dataset && focus.dataset.k) { const again = $(`[data-k="${focus.dataset.k}"]`, fb); if (again) { again.focus(); try { again.setSelectionRange(sel, sel); } catch (e) {} } }
      renderCmp();
    }
    function renderCmp() {
      const bar = $('#ek-cmpbar'); if (!bar) return;
      const ids = cmpGet().filter(id => P.some(p => p.sku === id));
      bar.classList.toggle('on', ids.length > 0);
      $('#ek-cmp-n').textContent = ids.length;
      $('#ek-cmp-names').textContent = ids.map(i => P.find(p => p.sku === i).name).join(' · ');
      $$('[data-cmp]').forEach(el => { el.checked = ids.includes(el.dataset.cmp); });
    }
    (function sortMenu() {
      const box = $('#ek-sort'); if (!box) return;
      const label = () => (SORTS.find(s => s[0] === state.sort) || SORTS[0])[1];
      box.innerHTML = `<button type="button" class="ek-dd-btn" aria-haspopup="listbox" aria-expanded="false"><span>${label()}</span><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button><ul class="ek-dd-list" role="listbox" hidden>${SORTS.map(s => `<li role="option" data-v="${s[0]}" aria-selected="${s[0] === state.sort}">${s[1]}</li>`).join('')}</ul>`;
      const btn = $('.ek-dd-btn', box), list = $('.ek-dd-list', box);
      const open = o => { list.hidden = !o; btn.setAttribute('aria-expanded', o); box.classList.toggle('open', o); };
      btn.addEventListener('click', () => open(list.hidden));
      $$('li', list).forEach(li => li.addEventListener('click', () => { state.sort = li.dataset.v; $$('li', list).forEach(x => x.setAttribute('aria-selected', x === li)); $('span', btn).textContent = label(); open(false); render(); }));
      document.addEventListener('click', e => { if (!box.contains(e.target)) open(false); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
    })();
    $('#ek-q').value = state.q;
    $('#ek-q').addEventListener('input', e => { state.q = e.target.value.trim(); state.shown = 24; render(true); });
    $('#ek-v-grid').addEventListener('click', () => { state.view = 'grid'; $('#ek-v-grid').setAttribute('aria-pressed', 'true'); $('#ek-v-list').setAttribute('aria-pressed', 'false'); render(); });
    $('#ek-v-list').addEventListener('click', () => { state.view = 'list'; $('#ek-v-list').setAttribute('aria-pressed', 'true'); $('#ek-v-grid').setAttribute('aria-pressed', 'false'); render(); });
    $('#ek-cmp-clear').addEventListener('click', () => { cmpSet([]); render(); });

    // выдвижная панель (телефон)
    const drawer = $('#ek-drawer'); let dstate = null;
    const cloneState = () => { const d = { sel: {}, pmin: state.pmin, pmax: state.pmax, q: state.q, sort: state.sort }; Object.keys(state.sel).forEach(k => d.sel[k] = new Set(state.sel[k])); return d; };
    const paintDrawer = () => { const db = $('#ek-drawer-body'); db.innerHTML = filterHTML(dstate); bindFilters(db, dstate, paintDrawer); const n = results(dstate).length; $('#ek-drawer-n').textContent = n + ' ' + wordFor(n); };
    $('#ek-open-drawer').addEventListener('click', () => { dstate = cloneState(); paintDrawer(); drawer.showModal(); });
    $('#ek-close-drawer').addEventListener('click', () => drawer.close());
    $('#ek-drawer-apply').addEventListener('click', () => { Object.keys(dstate.sel).forEach(k => state.sel[k] = new Set(dstate.sel[k])); state.pmin = dstate.pmin; state.pmax = dstate.pmax; state.shown = 24; drawer.close(); render(); });
    render();
  }

  /* ---------- страница товара: галерея ---------- */
  const gMain = $('#ek-g-main');
  if (gMain) $$('.ek-thumbs button').forEach(b => b.addEventListener('click', () => { gMain.src = b.dataset.src; $$('.ek-thumbs button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));

  /* ---------- страница товара: кнопка «Сравнить» и якоря ---------- */
  const pdpCmp = $('#ek-pdp-cmp');
  if (pdpCmp) {
    const sku = pdpCmp.dataset.sku;
    const paint = () => { const on = cmpGet().includes(sku); pdpCmp.textContent = on ? 'В сравнении ✓' : 'Добавить к сравнению'; };
    pdpCmp.addEventListener('click', () => { let c = cmpGet(); c = c.includes(sku) ? c.filter(x => x !== sku) : c.concat(sku); cmpSet(c); paint(); });
    paint();
  }

  /* ---------- страница сравнения ---------- */
  const cmpRoot = $('#ek-compare');
  if (cmpRoot) {
    const ALL = JSON.parse($('#ek-data').textContent).products;
    const ids = cmpGet();
    const items = ids.map(id => ALL.find(p => p.sku === id)).filter(Boolean);
    if (!items.length) { cmpRoot.innerHTML = `<div class="ek-empty">Список сравнения пуст. Отметьте «Сравнить» на карточках в <a href="${BASE}/catalog/led-ekrany/" style="text-decoration:underline">каталоге</a>.</div>`; }
    else {
      const lcd = items.every(p => p.diag); const rows = lcd ? [['Раздел', p => p.sectionName], ['Диагональ', p => p.diag + '″'], ['Конфигурация', p => p.layout || '—'], ['Разрешение', p => p.res || '—'], ['Шов', p => p.bezel != null ? p.bezel + ' мм' : '—'], ['Яркость', p => fmt(p.nit) + ' нит'], ['Режим', p => p.mode || '—'], ['Касания', p => p.touch ? p.touch + ' точек' : '—'], ['Бренд', p => p.brand], ['Цена', p => p.price ? fmt(p.price) + ' ₽' : 'по запросу']] : [['Раздел', p => p.sectionName], ['Шаг пикселя', p => p.pitchStr + ' мм'], ['Яркость', p => fmt(p.nit) + ' нит'], ['Защита', p => p.ip || '—'], ['Среда', p => p.env === 'out' ? 'Улица' : 'Помещение'], ['Обслуживание', p => ({ front: 'Переднее', back: 'Заднее', both: 'Переднее и заднее' })[p.svc] || '—'], ['Тип пикселя', p => p.pixelType || '—'], ['Размер', p => p.size ? p.size + ' мм' : '—'], ['Цена', p => p.price ? fmt(p.price) + ' ₽ ' + (p.priceUnit === 'шт' ? 'за табло' : 'за м²') : 'по запросу']];
      cmpRoot.innerHTML = `<div style="overflow-x:auto"><table class="ek-cmp-table"><thead><tr><th></th>${items.map(p => `<th><a href="${BASE}/catalog/tovar/${p.slug}/">${p.name}</a><br><img src="${BASE}/${p.photo}" alt="" style="width:120px;margin-top:8px;mix-blend-mode:multiply"><br><button type="button" class="ek-link" data-rm="${p.sku}">убрать</button></th>`).join('')}</tr></thead><tbody>${rows.map(([l, f]) => { const vals = items.map(f); const same = vals.every(v => v === vals[0]); return `<tr><td>${l}</td>${vals.map(v => `<td class="${same ? '' : 'diff'}">${v}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div><p style="margin-top:16px;color:var(--ek-muted);font-size:13.5px">Розовым выделены параметры, по которым модели различаются.</p>`;
      $$('[data-rm]', cmpRoot).forEach(b => b.addEventListener('click', () => { cmpSet(cmpGet().filter(x => x !== b.dataset.rm)); location.reload(); }));
    }
  }
})();
