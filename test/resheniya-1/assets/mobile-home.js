/* Мобильная главная, 01.11.2026: цена в первом экране, «Виды экранов» без эффектов, навигация решений плашками,
   листинг лентой (4 карточки на экране), нижняя панель действий, свёрнутые карточки ответственности. Работает только до 760 px; на компьютере ничего не делает. */
(function(){
  'use strict';
  var mq=matchMedia('(max-width:760px)');
  var CARDS=window.EP_HOME_CARDS||[];
  var done=false;
  function base0(){var a=document.querySelector('a.ep1-logo'); return a?a.getAttribute('href').replace(/\/$/,''):''}
  function init(){
    if(done||!mq.matches)return; done=true;

    // 1. Цена «от» под заголовком первого экрана
    var h1=document.getElementById('ep1-main-title');
    if(h1&&!document.querySelector('.ep1-hero-price')){
      h1.innerHTML=h1.innerHTML.replace(/<br\s*\/?>/g,' ');
      var p=document.createElement('p'); p.className='ep1-hero-price'; p.innerHTML='<b>от '+(window.EP_HOME_PRICE||'34 052 ₽')+'</b>за м², с НДС'; h1.insertAdjacentElement('afterend',p);
    }

    // 1б. Отдельное фото первого экрана для телефона (эксперимент 01.11.2026; убрать строку HERO_M — вернётся медиакуб)
    var HERO_M='';   // 02.11: фото для телефона подставляет сборка (<picture> в mobile_home.py), здесь не нужно
    var hp=document.querySelector('#ekranpro-first-screen .ep1-hero-photo');
    if(HERO_M&&hp&&!hp.__m){hp.__m=1; hp.removeAttribute('srcset'); hp.removeAttribute('sizes'); hp.src=base0()+'/assets/'+HERO_M; hp.classList.add('ep-hero-m');}

    // 2. Виды экранов: без проявления текста при прокрутке
    var pc=document.getElementById('ep-products-compare'); if(pc)pc.classList.add('epp-instant');

    // 4. Решения для бизнеса: лента карточек (фото, название, две кнопки), листаются пальцем; следующая видна справа — как в отзывах
    var bs=document.getElementById('ep-business-solutions');
    if(bs&&!bs.querySelector('.epbs-track')){
      var cards=[].slice.call(bs.querySelectorAll('.epbs-card')), grid=bs.querySelector('.epbs-grid');
      bs.querySelectorAll('.epbs-card h3, .epbs-description').forEach(function(e){e.innerHTML=e.innerHTML.replace(/<br\s*\/?>/g,' ').replace(/\s+/g,' ')});
      var track=document.createElement('div'); track.className='epbs-track';
      cards.forEach(function(c,i){
        var t=c.querySelector('h3'), d=c.querySelector('.epbs-description'), name=t?t.textContent.trim():'Решение '+(i+1);
        var sl=document.createElement('div'); sl.className='epbs-slide'; sl.appendChild(c);
        var m=document.createElement('div'); m.className='epbs-m';
        m.innerHTML='<h3></h3><p></p><div class="ep-mbtns"><button class="ep-mbtn" type="button">Получить расчёт</button><a class="ep-mbtn ep-mbtn-line">Подробнее</a></div>';
        m.querySelector('h3').textContent=name; m.querySelector('p').textContent=d?d.textContent.trim():'';
        m.querySelector('button').setAttribute('data-quote',name.toLowerCase()); m.querySelector('a').href=c.getAttribute('href')||'#';
        sl.appendChild(m); track.appendChild(sl);
      });
      grid.appendChild(track);
    }

    var base=document.querySelector('a.ep1-logo')?document.querySelector('a.ep1-logo').getAttribute('href').replace(/\/$/,''):'';
    var esc=function(x){return String(x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
    var imgBase=(window.EP_HOME_IMG_BASE!=null)?window.EP_HOME_IMG_BASE:base+'/';
    var price=function(v){return Math.round(v).toLocaleString('ru-RU').replace(/\s/g,'\u00a0')+' ₽'};

    // 10. Листинг на главной: лента в 2 ряда (на экране 4 карточки), листается вправо; «Заказать» открывает форму заявки
    var rv=document.getElementById('ep-reviews');
    if(rv&&CARDS.length&&!document.getElementById('ep-home-catalog')){
      var s=document.createElement('section'); s.id='ep-home-catalog'; s.setAttribute('aria-labelledby','ehc-title');
      s.innerHTML='<div class="ehc-head"><h2 id="ehc-title">Каталог светодиодных экранов</h2><a class="ehc-filter" href="'+base+'/catalog/led-ekrany/#catalog" aria-label="Фильтры каталога"><svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg></a></div>'+
        '<div class="ehc-grid">'+CARDS.map(function(c){var url=base+'/catalog/tovar/'+c.slug+'/', nm=esc(c.name);
          return '<article class="ehc-card"><a class="ehc-ph" href="'+url+'"><img src="'+imgBase+c.photo+'" alt="'+esc(c.typeName)+' '+nm+'" loading="lazy" width="480" height="360"><span class="ehc-badge">'+esc(c.badges&&c.badges[0]||c.sectionName)+'</span></a>'+
            '<div class="ehc-b"><a class="ehc-n" href="'+url+'">'+nm+'</a><div class="ehc-s">'+esc(c.specs.slice(0,2).map(function(x){return x[1]}).join(' · '))+'</div>'+
            '<div class="ehc-pr">от '+price(c.price)+' <small>за '+esc(c.priceUnit)+'</small></div><a class="ehc-btn" href="'+url+'">Посмотреть</a></div></article>'}).join('')+'</div>'+
        '<div class="ehc-foot"><span class="ehc-count">Листайте вправо →</span><a class="ehc-all" href="'+base+'/catalog/led-ekrany/">Весь каталог</a></div>';
      rv.insertAdjacentElement('beforebegin',s);
    }

    // Нижняя панель: Каталог · Подобрать экран · Получить расчёт
    if(!document.querySelector('.ep-mbar')){
      var bar=document.createElement('nav'); bar.className='ep-mbar'; bar.setAttribute('aria-label','Быстрые действия');
      bar.innerHTML='<a href="'+base+'/catalog/"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="7"/><rect x="14" y="4" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>Каталог</a>'+
        '<a href="#ep-podbor" data-scroll="ep-podbor"><svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>Подобрать экран</a>'+
        '<button type="button" class="ep-mbar-cta" data-quote="светодиодный экран"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h2M16 15v3"/></svg>Получить расчёт</button>';
      document.body.appendChild(bar);
      bar.addEventListener('click',function(e){var a=e.target.closest('[data-scroll]'); if(!a)return; var t=document.getElementById(a.dataset.scroll); if(!t)return; e.preventDefault();
        var hh=(document.querySelector('.ep1-header')||{offsetHeight:0}).offsetHeight; window.scrollTo({top:t.getBoundingClientRect().top+scrollY-hh+1,behavior:'smooth'});});
    }

    // 02.11 (2): ленты — текущая карточка (ms-cur) и соседние (ms-off: видно только фото и заголовок)
    var TRACKS='.epbs-track, #ep-reviews .eprv-track, .sx-proj-grid, .gl-cards.gl-ust, .sx-extras-grid, #ep-products-compare .ms-track';
    var markCur=window.epMarkCur=function(t){var kids=[].slice.call(t.children); if(!kids.length)return; var x0=t.getBoundingClientRect().left+20, best=0, bd=1e9;
      kids.forEach(function(k,i){var d=Math.abs(k.getBoundingClientRect().left-x0); if(d<bd){bd=d;best=i}});
      kids.forEach(function(k,i){k.classList.toggle('ms-cur',i===best); k.classList.toggle('ms-off',i!==best)});};
    var initTracks=window.epInitTracks=function(){[].slice.call(document.querySelectorAll(TRACKS)).forEach(function(t){if(t.__ms)return; t.__ms=1; var r=0;
      t.addEventListener('scroll',function(){if(!r)r=requestAnimationFrame(function(){r=0;markCur(t)})},{passive:true}); markCur(t);});};
    initTracks(); addEventListener('load',function(){[].slice.call(document.querySelectorAll(TRACKS)).forEach(markCur)});

    // 02.11 (3): меню «Каталог» — группы свёрнуты, раскрываются нажатием на заголовок группы; у групп со своей страницей первым пунктом «Все …»
    [].slice.call(document.querySelectorAll('#ep1-catalog [data-ep-menu-page="catalog"] .ep1-menu-group')).forEach(function(g){
      var hd=g.querySelector(':scope>h2, :scope>h3'), ul=g.querySelector(':scope>ul'); if(!hd||!ul||g.classList.contains('ms-acc'))return;
      g.classList.add('ms-acc'); hd.setAttribute('role','button'); hd.setAttribute('tabindex','0'); hd.setAttribute('aria-expanded','false');
      var a=hd.querySelector('a[href]'); if(a&&!ul.querySelector('.ms-all')){var li=document.createElement('li'); li.className='ms-all'; li.innerHTML='<a></a>'; li.firstChild.href=a.getAttribute('href'); li.firstChild.textContent='Все '+a.textContent.trim().replace(/^LED/,'LED').replace(/^LCD панели/,'LCD-панели'); ul.insertBefore(li,ul.firstChild);}
      var tg=function(e){if(e){e.preventDefault(); e.stopPropagation();} var o=g.classList.toggle('ms-open'); hd.setAttribute('aria-expanded',String(o));};
      hd.addEventListener('click',tg); hd.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')tg(e)});
    });

    // 02.11 (2): вопросы-ответы на телефоне — все закрыты
    [].slice.call(document.querySelectorAll('.ep-faq details[open], .ek-faq details[open]')).forEach(function(d){d.open=false});

    // 02.11: высота от верха заголовка первого экрана до низа экрана — для кадра фото и градиента (CSS --m-ch)
    var heroCH=window.epHeroCH=function(){var hero=document.querySelector('#ekranpro-first-screen .ep1-hero')||document.querySelector('.cat-main .sx-hero'); if(!hero||!mq.matches)return; var t=hero.querySelector('h1'); if(!t)return;
      var c=hero.getBoundingClientRect().bottom-t.getBoundingClientRect().top; if(c>0)hero.style.setProperty('--m-ch',Math.round(c)+'px');};
    heroCH(); addEventListener('resize',heroCH); addEventListener('load',heroCH); if(document.fonts&&document.fonts.ready)document.fonts.ready.then(heroCH);

    // Шапка (на тёмном фоне) и нижняя панель появляются вместе, когда первый экран ушёл и наверх подошли «Уличные экраны»
    var heroEl=document.querySelector('#ekranpro-first-screen .ep1-hero')||document.querySelector('.cat-main .sx-hero'), root=document.documentElement, past=null;
    // внутренние страницы (01.11): первый экран раздела — .sx-hero; без фото (каталог, карточка товара) — после 160 px прокрутки
    var checkPast=function(){var t=heroEl?heroEl.getBoundingClientRect().bottom+scrollY-60:(root.classList.contains('ep-ms')?160:innerHeight); var p=scrollY>t; if(p!==past){past=p; root.classList.toggle('ep-m-past',p)}};
    addEventListener('scroll',checkPast,{passive:true}); addEventListener('resize',checkPast); checkPast();

    // Кадр фото на телефоне: экран — по центру. cx, cy — центр экрана в долях ширины и высоты исходного фото, z — увеличение
    var FRAMES=[['outdoor-orenznak',.52,.36,1.15],['mediafacade-samara',.8,.37,1.6],['indoor-metropolis',.5,.32,1],['led-conference',.53,.4,1.25],
                ['solution-stage',.64,.38,1],['solution-retail',.67,.55,1.2],['solution-petrol',.38,.55,1.3],['solution-mall',.5,.5,1]];
    var framed=[];
    function frame(img){
      var f=img.__f, box=img.parentElement.getBoundingClientRect(), cw=box.width, ch=box.height; if(!cw||!ch)return;
      var ar=(+img.getAttribute('width')||img.naturalWidth)/(+img.getAttribute('height')||img.naturalHeight)||1.5;
      var w=Math.max(cw,ch*ar)*f[3], h=w/ar;
      var l=Math.min(0,Math.max(cw-w,cw/2-f[1]*w)), t=Math.min(0,Math.max(ch-h,ch/2-f[2]*h));
      var st=img.style; st.setProperty('width',w+'px','important'); st.setProperty('height',h+'px','important'); st.setProperty('left',l+'px','important'); st.setProperty('top',t+'px','important');
      img.sizes=Math.round(w)+'px';
    }
    // Отдельные фото для телефона (вертикальные, готовятся под мобильную версию): показываются целиком, без кадрирования
    var MOBILE_PHOTOS={};
    document.querySelectorAll('#ep-products-compare .epp-photo img, #ep-business-solutions .epbs-photo').forEach(function(img){
      var s0=img.getAttribute('src')||'';
      for(var key in MOBILE_PHOTOS) if(s0.indexOf(key)>=0){var mp=MOBILE_PHOTOS[key];
        img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src=base+'/assets/'+mp[0]; img.setAttribute('width',mp[1]); img.setAttribute('height',mp[2]); img.loading='eager';
        img.classList.add('ep-mphoto'); img.parentElement.classList.add('ep-mphoto-box'); img.__m=1; break}
      if(img.__m)return;
      var src=img.getAttribute('src')||''; for(var k=0;k<FRAMES.length;k++) if(src.indexOf(FRAMES[k][0])>=0){img.__f=FRAMES[k];break}
      if(!img.__f)return; img.classList.add('ep-framed'); img.loading='eager'; framed.push(img); frame(img);
    });
    var reframe=function(){framed.forEach(frame)};
    addEventListener('resize',reframe); addEventListener('load',reframe);
    if(window.ResizeObserver){var ro=new ResizeObserver(reframe); framed.forEach(function(i){ro.observe(i.parentElement)})}
    var bsTitle=document.getElementById('epbs-title'); if(bsTitle)bsTitle.innerHTML=bsTitle.innerHTML.replace(/<br\s*\/?>/g,' ');

    // 3. Подбор: выбор качества — отдельной строкой во всю ширину, между «Шаг · Разрешение» и бюджетом
    var pq=document.getElementById('pb-q'), pout=document.querySelector('#ep-podbor .pb-out');
    if(pq&&pout&&!pout.querySelector('.pb-qrow')){var row=document.createElement('div'); row.className='pb-qrow'; row.appendChild(pq); pout.insertBefore(row,pout.children[2]||null);}

    // 8. Карта: стартовое положение — самый левый город (Эр-Рияд) у левого края, дальше видны Москва, Казань, Тольятти
    var mv=document.querySelector('#ep-page-end .ep-map-viewport');
    if(mv){var mapStart=function(){var pts=[].slice.call(mv.querySelectorAll('.ep-map-point')); if(!pts.length||mv.scrollLeft>0&&mv.__user)return;
        var vl=mv.getBoundingClientRect().left, min=Infinity; pts.forEach(function(p){var l=p.getBoundingClientRect().left-vl+mv.scrollLeft; if(l<min)min=l});
        if(isFinite(min))mv.scrollLeft=Math.max(0,min-14);};
      ['touchstart','pointerdown','wheel'].forEach(function(e){mv.addEventListener(e,function(){mv.__user=true},{passive:true})});
      mapStart(); addEventListener('load',mapStart); setTimeout(mapStart,600);}

    // 6. Инженерная ответственность: карточки свёрнуты, открываются по заголовку
    var en=document.getElementById('ep-engineering');
    if(en) en.addEventListener('click',function(e){var h=e.target.closest('.epeng-fact:not(.epeng-experience) h3'); if(h)h.parentElement.classList.toggle('is-open')});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
  if(mq.addEventListener)mq.addEventListener('change',init);
})();
/* 02.11: листинг на главной на компьютере — стрелки листают ленту на 4 карточки */
(function(){
  function go(){var s=document.getElementById('ep-home-catalog'); if(!s)return; var g=s.querySelector('.ehc-grid'), pv=s.querySelector('.ehc-prev'), nx=s.querySelector('.ehc-next'); if(!g||!pv||!nx)return;
    var upd=function(){pv.disabled=g.scrollLeft<4; nx.disabled=g.scrollLeft+g.clientWidth>=g.scrollWidth-4};
    var step=function(d){var c=g.querySelector('.ehc-card'); var gap=parseFloat(getComputedStyle(g).columnGap)||0; var n=Math.max(1,Math.round(g.clientWidth/((c?c.offsetWidth:g.clientWidth)+gap))); g.scrollBy({left:d*n*((c?c.offsetWidth:0)+gap),behavior:'smooth'})};
    pv.addEventListener('click',function(){step(-1)}); nx.addEventListener('click',function(){step(1)});
    g.addEventListener('scroll',function(){requestAnimationFrame(upd)},{passive:true}); addEventListener('resize',upd); upd();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go); else go();
})();
