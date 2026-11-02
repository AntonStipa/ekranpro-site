/* Мобильная версия внутренних страниц, 01.11.2026 — по образцу мобильной главной. Работает только до 760 px.
   Шапка: на первом экране полупрозрачная поверх фото, после ухода первого экрана — тёмная закреплённая (вместе с нижней панелью,
   её показывает mobile-home.js классом ep-m-past). Цена первого экрана — «от … ₽ за м², с НДС». */
(function(){
  'use strict';
  var mq=matchMedia('(max-width:760px)'), root=document.documentElement;
  root.classList.add('ep-ms');
  if(!document.querySelector('.cat-main .sx-hero')) root.classList.add('ep-ms-nohero');
  var h=document.querySelector('#ekranpro-first-screen .ep1-header');
  var docked=false, raf=0;
  function dock(){
    raf=0; if(!h)return;
    var d=mq.matches&&(scrollY>(h.offsetHeight||56)||h.classList.contains('is-nav-open')&&scrollY>0);
    if(d===docked)return; docked=d;
    h.classList.remove('ep-msa'); h.classList.toggle('ep-msd',d);
    if(d){h.getBoundingClientRect(); h.classList.add('ep-msa');}
  }
  addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(dock)},{passive:true});
  addEventListener('resize',dock); dock();
  // высота шапки над липкими плашками (вкладки карточки товара): 56 px, когда шапка на экране, иначе 0
  function hdrTop(){
    if(!h)return; var on=mq.matches&&h.classList.contains('ep-msd')&&(root.classList.contains('ep-m-past')||h.classList.contains('is-nav-open'))&&!h.classList.contains('ep-mh');
    root.style.setProperty('--ms-top',on?(h.offsetHeight||56)+'px':'0px');
  }
  if(h&&window.MutationObserver){var mo=new MutationObserver(hdrTop); mo.observe(h,{attributes:true,attributeFilter:['class']}); mo.observe(root,{attributes:true,attributeFilter:['class']});}
  hdrTop();

  function init(){
    if(!mq.matches)return;   // на компьютере ничего не меняем
    // «Получить расчёт» в нижней панели: в форме — тема страницы (как у кнопки первого экрана)
    var hq=document.querySelector('.cat-main .sx-hero [data-quote]'), mc=document.querySelector('.ep-mbar-cta');
    if(hq&&mc)mc.setAttribute('data-quote',hq.getAttribute('data-quote'));
    // «Подобрать экран» в нижней панели: на странице без подбора ведёт к подбору раздела (карточка товара) или главной
    var pb=document.querySelector('.ep-mbar [data-scroll="ep-podbor"]');
    if(pb&&!document.getElementById('ep-podbor')){
      var base=(document.documentElement.getAttribute('data-base')||'').replace(/\/$/,''), to=base+'/#ep-podbor';
      var cr=[].slice.call(document.querySelectorAll('.ek-crumbs a, .sx-crumbs a')).map(function(a){return a.getAttribute('href')}).filter(function(x){return x&&/\/catalog\/[^/]+\/$/.test(x)});
      if(cr.length&&!/lcd-paneli-i-videosteny|led-ekrany\/$/.test(cr[cr.length-1]))to=cr[cr.length-1]+'#ep-podbor';
      pb.setAttribute('href',to); pb.removeAttribute('data-scroll');
    }
    // заголовок первого экрана: переносы строк — пробелами (на телефоне строки складываются сами)
    var h1=document.querySelector('.cat-main .sx-hero h1');
    if(h1&&mq.matches) h1.querySelectorAll('br').forEach(function(br){br.replaceWith(' ')});
    // цена в первом экране: число крупно, «за м², с НДС»
    var pr=document.querySelector('.cat-main .sx-hero .sx-h1-price');
    if(pr&&!pr.querySelector('.ep-ms-num')){
      var smalls=pr.querySelectorAll('small'), txt=[].slice.call(pr.childNodes).filter(function(n){return n.nodeType===3&&n.textContent.trim()})[0];
      if(txt){var b=document.createElement('b'); b.className='ep-ms-num'; b.textContent=txt.textContent.trim(); pr.replaceChild(b,txt); pr.insertBefore(document.createTextNode(' '),b); b.after(document.createTextNode(' '));}
      var u=smalls[smalls.length-1]; if(u&&/м²/.test(u.textContent)&&!/НДС/.test(u.textContent)) u.textContent=u.textContent.trim()+', с НДС';
    }
  }
  // нижняя панель на карточке товара: «Получить расчёт» — заявка на эту модель (как кнопка карточки)
  document.addEventListener('click',function(e){
    var b=e.target.closest('.ep-mbar-cta'); if(!b||!mq.matches)return;
    var own=document.querySelector('.ek-mob-cta [data-order]')||document.querySelector('.ek-buy [data-order], .ek-price-box [data-order]');
    if(own){e.preventDefault(); e.stopImmediatePropagation(); own.click();}
  },true);
  // свёрнутые списки (этапы): открываются по нажатию на строку
  document.addEventListener('click',function(e){
    if(!mq.matches)return;
    var li=e.target.closest('.sx-steps-grid li'); if(!li||e.target.closest('a,button'))return;
    li.classList.toggle('is-open'); li.setAttribute('aria-expanded',li.classList.contains('is-open'));
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
  if(mq.addEventListener)mq.addEventListener('change',init);
})();
