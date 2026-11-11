/* Кейсы (11.11.2026): видео ВК без нагрузки на страницу, фильтры, «Показать ещё», просмотр фото.
   Видео: на странице только обложка (ссылка на ВК). По клику плеер ВК (iframe video_ext.php) создаётся в окне #pf-player,
   при закрытии iframe удаляется — видео останавливается и больше ничего не грузит. Без JS ссылка просто открывает ролик во ВКонтакте. */
(function(){
  var dlg=document.getElementById('pf-player');
  if(dlg&&dlg.showModal){
    var frame=document.getElementById('pf-player-frame'),title=document.getElementById('pf-player-title'),vk=document.getElementById('pf-player-vk');
    var close=function(){frame.innerHTML='';if(dlg.open)dlg.close()};
    document.addEventListener('click',function(e){
      var a=e.target.closest&&e.target.closest('[data-vk-embed]');
      if(!a||e.metaKey||e.ctrlKey||e.shiftKey)return;
      e.preventDefault();
      var f=document.createElement('iframe');
      f.src=a.getAttribute('data-vk-embed');f.title=a.getAttribute('data-vk-title')||'Видео';
      f.allow='autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock';f.allowFullscreen=true;
      frame.innerHTML='';frame.appendChild(f);
      title.textContent=a.getAttribute('data-vk-title')||'';vk.href=a.href;
      dlg.showModal();
    });
    dlg.addEventListener('close',function(){frame.innerHTML=''});
    dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.closest('[data-pf-close]'))close()});
  }

  /* /portfolio/: фильтры (внутри группы — «или», между группами — «и»), счётчик, мозаика (ряд из 3; большая + 2 маленькие), «Показать ещё» по 12 */
  var feed=document.querySelector('[data-pf-feed]'),bar=document.querySelector('[data-pf-fbar]');
  if(feed&&bar){
    var items=[].slice.call(feed.children),step=+feed.getAttribute('data-first')||12,shown=step,sel={};
    var more=document.querySelector('[data-pf-more]'),none=document.querySelector('[data-pf-none]'),cnt=bar.querySelector('[data-pf-count]'),
        act=bar.querySelector('[data-pf-active]'),reset=bar.querySelector('[data-pf-reset]'),dds=[].slice.call(bar.querySelectorAll('.pf-dd'));
    var has=function(li,key,vals){var v=' '+(li.getAttribute('data-'+key)||'')+' ';return vals.some(function(x){return v.indexOf(' '+x+' ')>-1})};
    function apply(){
      var keys=Object.keys(sel).filter(function(k){return sel[k].length});
      var match=items.filter(function(li){return keys.every(function(k){return has(li,k,sel[k])})});
      items.forEach(function(li){li.hidden=true});
      match.forEach(function(li,i){var m=i%12;li.hidden=i>=shown;li.classList.toggle('pf-big',m===3||m===11);li.classList.toggle('pf-big-l',m===3);li.classList.toggle('pf-big-r',m===11);li.classList.toggle('pf-col1',m===9||m===10)});
      cnt.textContent=match.length;none.hidden=match.length>0;
      if(more)more.hidden=match.length<=shown;
      act.innerHTML='';
      dds.forEach(function(dd){
        var k=dd.getAttribute('data-key'),boxes=[].slice.call(dd.querySelectorAll('input:checked')),n=dd.querySelector('.pf-dd-n');
        n.hidden=!boxes.length;n.textContent=boxes.length;
        boxes.forEach(function(b){var x=document.createElement('button');x.type='button';x.textContent=b.nextElementSibling.textContent;x.setAttribute('aria-label','Убрать фильтр: '+x.textContent);
          x.addEventListener('click',function(){b.checked=false;b.dispatchEvent(new Event('change',{bubbles:true}))});act.appendChild(x)});
      });
      reset.hidden=!keys.length;
    }
    function closeAll(except){dds.forEach(function(dd){if(dd===except)return;dd.querySelector('.pf-dd-panel').hidden=true;dd.querySelector('.pf-dd-btn').setAttribute('aria-expanded','false')})}
    dds.forEach(function(dd){
      var btn=dd.querySelector('.pf-dd-btn'),panel=dd.querySelector('.pf-dd-panel'),k=dd.getAttribute('data-key');
      btn.addEventListener('click',function(){var open=panel.hidden;closeAll(dd);panel.hidden=!open;btn.setAttribute('aria-expanded',open)});
      panel.addEventListener('change',function(){sel[k]=[].map.call(panel.querySelectorAll('input:checked'),function(i){return i.value});shown=step;apply()});
    });
    document.addEventListener('click',function(e){if(!e.target.closest('.pf-dd'))closeAll()});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeAll()});
    reset.addEventListener('click',function(){[].forEach.call(bar.querySelectorAll('input:checked'),function(i){i.checked=false});sel={};shown=step;apply()});
    if(more)more.addEventListener('click',function(){shown+=step;apply()});
    apply();
  }

  /* фото кейса: просмотр крупно, листание стрелками и клавишами */
  var z=document.getElementById('pf-zoom');
  if(z&&z.showModal){
    var links=[].slice.call(document.querySelectorAll('a[data-pf-zoom]')),img=document.getElementById('pf-zoom-img'),i=0;
    var show=function(n){i=(n+links.length)%links.length;img.src=links[i].href;img.alt=links[i].querySelector('img').alt};
    links.forEach(function(a,n){a.addEventListener('click',function(e){e.preventDefault();show(n);z.showModal()})});
    z.addEventListener('click',function(e){var s=e.target.closest('[data-pf-step]');if(s){show(i+ +s.getAttribute('data-pf-step'));return}if(e.target===z||e.target.closest('[data-pf-close]'))z.close()});
    z.addEventListener('keydown',function(e){if(e.key==='ArrowRight')show(i+1);if(e.key==='ArrowLeft')show(i-1)});
  }
})();
