
(() => {
  'use strict';
  const root = document.getElementById('ekranpro-first-screen');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => Array.from(root.querySelectorAll(selector));
  const header = $('.ep1-header');
  const mainbar = $('.ep1-mainbar');
  const hero = $('.ep1-hero');
  const nav = $('.ep1-nav');
  const menu = $('.ep1-menu-toggle');
  const catalog = $('#ep1-catalog');
  const toggle = $('[data-ep-menu-trigger="catalog"]');
  const triggers = $$('[data-ep-menu-trigger]');
  const pages = $$('[data-ep-menu-page]');
  const groups = $$('.ep1-menu-group');
  let activePage = 'catalog';
  let activeTrigger = toggle;
  const menuLabels = { catalog: 'Каталог оборудования', solutions: 'Решения', services: 'Услуги' };
  const shade = $('.ep1-catalog-shade');
  const search = $('#ep1-search-input');
  const overlay = $('#ep1-overlay');
  const task = $('#ep1-task');
  const product = $('#ep1-product');
  const items = $$('.ep1-catalog-list li');
  const columns = $$('.ep1-catalog-column');
  let returnFocus = null;
  let lastPreset = '';
  let previousOverflow = '';
  let headerFrame = 0;
  let heroTop = 0;
  let heroHeight = 1;
  let headerHeight = 84;
  let headerDocked = false;
  let keyboardReveal = false;
  const normalize = value => value.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[-–—/]/g, ' ');
  const hoverMenu = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)');
  let hoverOpenTimer = 0;
  let hoverCloseTimer = 0;
  function clearHoverTimers() {
    window.clearTimeout(hoverOpenTimer);
    window.clearTimeout(hoverCloseTimer);
  }
  function scheduleHoverClose() {
    clearHoverTimers();
    if (!hoverMenu.matches) return;
    hoverCloseTimer = window.setTimeout(() => {
      if (catalog.contains(document.activeElement) || document.activeElement === search) return;
      closeCatalog();
    }, 260);
  }


  function renderHeader() {
    headerFrame=0;
    const open=!catalog.hidden||nav.classList.contains('is-open');
    header.classList.add('is-visible','is-scrolled');
    header.classList.toggle('is-nav-open',open);
    shade.hidden=!open;
    positionMenu();
  }
  function positionMenu() {
    const compact = activePage !== 'catalog' && !catalog.classList.contains('is-searching');
    catalog.classList.toggle('is-compact', compact);
    catalog.classList.toggle('is-solutions', compact && activePage === 'solutions');
    if (catalog.hidden || !compact || window.matchMedia('(max-width:760px)').matches) {
      catalog.style.removeProperty('--ep-menu-left');
      return;
    }
    const headerBox = header.getBoundingClientRect();
    const triggerBox = activeTrigger.getBoundingClientRect();
    const panelWidth = catalog.getBoundingClientRect().width;
    const maxLeft = Math.max(16, headerBox.width - panelWidth - 16);
    const left = Math.min(maxLeft, Math.max(16, triggerBox.left - headerBox.left));
    catalog.style.setProperty('--ep-menu-left', Math.round(left) + 'px');
  }
  function requestHeader() {
    if (!headerFrame) headerFrame = window.requestAnimationFrame(renderHeader);
  }
  function measureHeader() {
    headerHeight = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--ep-header-height', headerHeight + 'px');
    const box = hero ? hero.getBoundingClientRect() : null;
    heroTop = box ? box.top + window.scrollY : 0;
    heroHeight = Math.max(1, box ? box.height : window.innerHeight);
    renderHeader();
  }
  function closeNav() {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = 'Меню +';
  }
  function closeCatalog() {
    clearHoverTimers();
    catalog.hidden = true;
    triggers.forEach(button => button.setAttribute('aria-expanded', 'false'));
    $('#ep1-menu-note').hidden = true;
    renderHeader();
  }
  function closeAll() {
    closeNav();
    closeCatalog();
  }
  function filterCatalog() {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    const searching = terms.length > 0;
    let count = 0;
    items.forEach(item => {
      const page = item.closest('[data-ep-menu-page]');
      const inScope = searching || page.dataset.epMenuPage === activePage;
      item.hidden = !inScope || !terms.every(term => normalize(item.textContent).includes(term));
      if (!item.hidden) count++;
    });
    groups.forEach(group => { group.hidden = !Array.from(group.querySelectorAll('li')).some(item => !item.hidden); });
    columns.forEach(column => { column.hidden = !Array.from(column.querySelectorAll('li')).some(item => !item.hidden); });
    pages.forEach(page => { page.hidden = !Array.from(page.querySelectorAll('li')).some(item => !item.hidden); });
    catalog.classList.toggle('is-searching', searching);
    $('.ep1-search-state').hidden = !searching;
    $('#ep1-search-status').textContent = searching ? 'Найдено в меню: ' + count : '';
    $('.ep1-search-empty').hidden = count !== 0;
    catalog.setAttribute('aria-label', searching ? 'Результаты поиска по меню' : menuLabels[activePage]);
    triggers.forEach(button => button.setAttribute('aria-expanded', String(!catalog.hidden && !searching && button.dataset.epMenuTrigger === activePage)));
    renderHeader();
  }
  function openCatalog(page = activePage, button = activeTrigger) {
    clearHoverTimers();
    closeNav();
    activePage = page;
    activeTrigger = button;
    catalog.hidden = false;
    $('#ep1-menu-note').hidden = true;
    filterCatalog();
  }
  triggers.forEach(button => {
    button.addEventListener('pointerenter', event => {
      if (!hoverMenu.matches || event.pointerType === 'touch') return;
      clearHoverTimers();
      hoverOpenTimer = window.setTimeout(() => {
        search.value = '';
        openCatalog(button.dataset.epMenuTrigger, button);
        catalog.scrollTop = 0;
      }, 100);
    });
    button.addEventListener('pointerleave', event => {
      if (event.pointerType === 'touch') return;
      scheduleHoverClose();
    });
    button.addEventListener('click', () => {
      const page = button.dataset.epMenuTrigger;
      if (!catalog.hidden && activePage === page && !search.value.trim()) { closeCatalog(); return; }
      search.value = '';
      openCatalog(page, button);
      catalog.scrollTop = 0;
      if (window.matchMedia('(max-width:760px)').matches) $('[data-catalog-back]').focus({ preventScroll: true });
    });
    button.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      search.value = '';
      openCatalog(button.dataset.epMenuTrigger, button);
      const first = items.find(item => !item.hidden);
      if (first) first.querySelector('a').focus();
    });
  });
  catalog.addEventListener('pointerenter', clearHoverTimers);
  catalog.addEventListener('pointerleave', scheduleHoverClose);
  header.addEventListener('pointerleave', scheduleHoverClose);
  hoverMenu.addEventListener('change', () => { clearHoverTimers(); closeCatalog(); });
  menu.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    closeCatalog();
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? 'Закрыть ×' : 'Меню +';
    renderHeader();
  });
  $('.ep1-search').addEventListener('submit', event => { event.preventDefault(); openCatalog(); });
  search.addEventListener('input', () => { if (search.value.trim()) openCatalog(); else if (!catalog.hidden) filterCatalog(); });
  search.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && !catalog.hidden) {
      const first = items.find(item => !item.hidden);
      if (first) { event.preventDefault(); first.querySelector('a').focus(); }
    }
  });
  $('.ep1-search-clear').addEventListener('click', () => { search.value = ''; filterCatalog(); search.focus(); });
  shade.addEventListener('click', closeAll);
  $('[data-catalog-close]').addEventListener('click', () => { closeAll(); menu.focus(); });
  $('[data-catalog-back]').addEventListener('click', () => {
    closeCatalog();
    nav.classList.add('is-open');
    menu.setAttribute('aria-expanded', 'true');
    menu.textContent = 'Закрыть ×';
    renderHeader();
    activeTrigger.focus();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.ep1-header')) closeAll();
    const link = event.target.closest('a[href]');
    if (link && header.contains(link) && !link.hasAttribute('data-menu-draft')) closeAll();
  });

  $$('[data-menu-draft]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const note = $('#ep1-menu-note');
    note.querySelector('p').textContent = link.dataset.menuDraft + ': пункт добавлен в меню. Адрес страницы в исходной таблице пока не указан.';
    note.hidden = false;
    note.scrollIntoView({ block: 'nearest' });
  }));
  $('#ep1-menu-note button').addEventListener('click', () => { $('#ep1-menu-note').hidden = true; });
  header.addEventListener('focusin', () => {
    if (headerDocked && !header.classList.contains('is-visible')) {
      keyboardReveal = true;
      renderHeader();
    }
  });
  root.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!header.contains(document.activeElement)) {
        keyboardReveal = false;
        closeAll();
      }
    }, 0);
  });

  root.addEventListener('keydown',event=>{if(event.key==='Escape'){const wasOpen=!catalog.hidden;closeAll();if(wasOpen)activeTrigger.focus();}});
  window.addEventListener('scroll', requestHeader, { passive: true });
  window.addEventListener('resize', measureHeader, { passive: true });
  window.addEventListener('pageshow', measureHeader);
  if (typeof ResizeObserver !== 'undefined') {
    const headerObserver = new ResizeObserver(measureHeader);
    headerObserver.observe(mainbar);
    if (hero) headerObserver.observe(hero);
  }
  if (document.fonts?.ready) document.fonts.ready.then(measureHeader);
  measureHeader();
})();


(() => {
  'use strict';
  const footer = document.getElementById('ep-contact');
  if (!footer) return;
  const mobile = window.matchMedia('(max-width:640px)');
  const groups = Array.from(footer.querySelectorAll('[data-footer-group]'));
  function layout() {
    groups.forEach(group => {
      group.open = !mobile.matches;
      group.querySelector('summary').tabIndex = mobile.matches ? 0 : -1;
    });
  }
  groups.forEach(group => group.querySelector('summary').addEventListener('click', event => {
    if (!mobile.matches) event.preventDefault();
  }));
  layout();
  if (mobile.addEventListener) mobile.addEventListener('change', layout);
  else mobile.addListener(layout);
})();
