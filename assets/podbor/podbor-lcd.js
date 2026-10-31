/* 31.10.2026, пачка 4: подбор LCD в стиле подбора LED (разметка — templates/podbor_lcd.html, стили — podbor.css).
   data-mode у #pl-data: «wall» — видеостена из панелей (диагональ, шов, раскладка, способ установки),
   «panel» — информационные / профессиональные / интерактивные панели (тип, диагональ, количество, способ установки).
   Модели — из каталога (podbor.py, models_lcd): только публичная цена. Расчёт — чистая функция calc(), переносится на Next.js без изменений. */
(function(){
  'use strict';
  var FORM_ENDPOINT=''; // пусто = демонстрационный режим, как в подборе LED
  var $=function(id){return document.getElementById(id)};
  var D=$('pl-data'), MODELS=JSON.parse(D.textContent), MODE=D.getAttribute('data-mode')||'wall';
  var MOUNTS=JSON.parse(D.getAttribute('data-mounts')||'null')||['wall','mobile','hang'];   // 31.10, приёмка пачки 4: три способа на всех LCD-страницах
  var MOUNT_LABEL={wall:'На стену',mobile:'Мобильная конструкция',hang:'Подвес'};
  var SEAMS=[0.88,1.8,3.5];   // в подборе только три шва; остальные значения каталога сведены к ближайшему (podbor.py)
  var root=$('ep-podbor');
  var st={kind:D.getAttribute('data-kind')||'std',mount:MOUNTS[0],orient:'h',diag:0,seam:0,cols:3,rows:3,qty:1};

  function fmt(v,dg){var s=(+v).toFixed(dg==null?2:dg);if(s.indexOf('.')>=0)s=s.replace(/0+$/,'').replace(/\.$/,'');return s.replace('.',',')}
  function sp(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
  function uniq(a){return a.filter(function(v,i){return a.indexOf(v)===i}).sort(function(x,y){return x-y})}
  function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
  function money(a,b){ // как в подборе LED: низ вниз, верх вверх
    function part(v,unit,up){var k=unit==='млн'?1e6:1e3, x=v/k; return unit==='млн'?(up?Math.ceil(x*10)/10:Math.floor(x*10)/10):(up?Math.ceil(x/10)*10:Math.floor(x/10)*10)}
    var unit=b>=1e6?'млн':'тыс.', x=part(a,unit,false), y=part(b,unit,true);
    var f=function(v){return unit==='млн'?v.toFixed(1).replace('.',','):sp(v)};
    if(x<=0) x=unit==='млн'?0.1:10;
    if(a===b||f(x)===f(y)) return 'от '+f(x)+' '+unit+' ₽';
    return f(x)+' — '+f(y)+' '+unit+' ₽';
  }
  function pool(){return MODELS.filter(function(m){return MODE==='wall'||m.kind===st.kind})}
  function diags(){return uniq(pool().map(function(m){return m.diag}))}
  function seams(){return uniq(pool().filter(function(m){return m.diag===st.diag&&m.seam}).map(function(m){return m.seam}))}   // доступные для диагонали
  function fixState(){
    var ds=diags(); if(ds.indexOf(st.diag)<0) st.diag=ds.indexOf(55)>=0?55:ds[Math.floor(ds.length/2)]||0;
    if(MODE==='wall'){var ss=seams(); if(ss.indexOf(st.seam)<0) st.seam=ss.indexOf(1.8)>=0?1.8:ss[0]||0;}
  }

  // Чистая функция: состояние → размер, разрешение, вилка
  function calc(s){
    var ms=pool().filter(function(m){return m.diag===s.diag&&(MODE!=='wall'||m.seam===s.seam)});
    if(!ms.length) return null;
    var n=MODE==='wall'?s.cols*s.rows:s.qty, pw=median(ms.map(function(m){return m.w})), ph=median(ms.map(function(m){return m.h}));
    if(s.orient==='v'){var t=pw;pw=ph;ph=t;}
    var res=mostCommon(ms.map(function(m){return m.res}))||'1920x1080', rr=res.split('x').map(Number);
    if(s.orient==='v') rr=[rr[1],rr[0]];
    var lo=Math.min.apply(null,ms.map(function(m){return m.price})), hi=Math.max.apply(null,ms.map(function(m){return m.price}));
    var W=MODE==='wall'?pw*s.cols/1000:pw/1000, H=MODE==='wall'?ph*s.rows/1000:ph/1000;
    return {n:n,models:ms.map(function(m){return m.sku}),pw:pw,ph:ph,W:W,H:H,diagIn:Math.sqrt(W*W+H*H)*1000/25.4,
            resW:MODE==='wall'?rr[0]*s.cols:rr[0],resH:MODE==='wall'?rr[1]*s.rows:rr[1],from:lo*n,to:hi*n,count:ms.length};
  }
  function median(a){a=a.slice().sort(function(x,y){return x-y});return a[Math.floor(a.length/2)]}
  function mostCommon(a){var c={},b=null;a.forEach(function(x){c[x]=(c[x]||0)+1;if(b===null||c[x]>c[b])b=x});return b}
  function resLabel(w,h){var m=Math.max(w,h);return m>=7680?'8K и выше':m>=3840?'Не меньше 4K':m>=1920?'Full HD и выше':'HD'}
  function panelWord(n){return n%10===1&&n%100!==11?'панель':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'панели':'панелей'}

  // ——— Схема: стена и пол как в подборе LED (стиль Б, серый фон), человек 1,75 м в том же масштабе ———
  var T={bg:'#e8ebe8',room:'#dcdfdb',floor:'#c4c8c4',screen:'#171a1c',metal:'#a3a8a4',person:'#171a1c',dim:'#60656a',text:'#171a1c'};
  function sceneSVG(VW,VH,r){
    var o='', narrow=VW<520, padL=narrow?40:70, padR=narrow?40:120, top=40, gy=VH-(narrow?60:46);
    var W=r.W, H=r.H, mob=st.mount==='mobile', stand=mob, hang=st.mount==='hang';
    var lift=mob?(MODE==='wall'?0.55:0.8):hang?(MODE==='wall'?1.2:2):clamp(1.65-H/2,0.5,1.2);   // низ экрана: на стене — центр около 1,65 м, на стойке и подвесе — фиксированная высота
    var ceil=hang?lift+H+0.9:0;
    var qty=MODE==='wall'?1:Math.min(st.qty,4), gap=0.6, rowW=W*qty+gap*(qty-1);
    var sceneH=Math.max(lift+H+0.5,2.2,ceil), personGap=Math.max(1.2,rowW*0.25);
    var s=Math.min((gy-top)/sceneH,(VW-padL-padR)/(rowW+personGap+0.6),220);
    var x0=padL+((VW-padL-padR)-(rowW+personGap+0.6)*s)/2, sy=gy-(lift+H)*s, sw=W*s, sh=H*s;
    function R(x,y,w,h,fill,extra){return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(w,0).toFixed(1)+'" height="'+Math.max(h,0).toFixed(1)+'" fill="'+fill+'"'+(extra||'')+'/>'}
    function L(x1,y1,x2,y2,c,w,dash){return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+c+'" stroke-width="'+(w||1)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'}
    function Tx(x,y,t,a,c,w,sz){return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="'+(sz||12)+'" fill="'+(c||T.text)+'" text-anchor="'+(a||'middle')+'"'+(w?' font-weight="'+w+'"':'')+' font-family="Inter,Arial,sans-serif">'+t+'</text>'}
    o+=R(0,0,VW,VH,T.bg)+R(0,0,VW,gy,T.room)+R(0,gy,VW,VH-gy,T.floor);
    var cy=hang?gy-ceil*s:0; if(hang) o+=R(0,0,VW,cy,T.bg)+L(0,cy,VW,cy,T.dim,1.2);   // подвес: линия потолка, тросы к экрану
    var img=$(H>W*1.25?'pb-img-plain':'pb-img-screen'), href=img&&img.getAttribute('src');   // вертикальный экран — картинка без текста, как в подборе LED
    for(var q=0;q<qty;q++){
      var sx=x0+q*(W+gap)*s, id='pl-clip-'+q;
      // опоры
      if(stand){
        // 31.10, круг 3: стойка стоит только на колёсах — стойки доходят до перекладины над колёсами, в пол упираются лишь колёса
        var lw=Math.max(3,0.05*s), legs=MODE==='wall'?2:1, base=Math.max(4,0.06*s), wr=Math.max(3,0.045*s), by=gy-2*wr-base;
        for(var i=0;i<legs;i++){var lx=legs===1?sx+sw/2-lw/2:sx+sw*(i===0?0.18:0.82)-lw/2; o+=R(lx,sy+sh*0.4,lw,by-sy-sh*0.4,T.metal);}
        var bw=Math.min(sw*0.92,Math.max(0.7*s,sw*(legs===1?0.55:0.92)));
        o+=R(sx+(sw-bw)/2,by,bw,base,T.metal);
        [sx+(sw-bw)/2+wr,sx+(sw+bw)/2-wr].forEach(function(cx){o+='<circle cx="'+cx.toFixed(1)+'" cy="'+(gy-wr).toFixed(1)+'" r="'+wr.toFixed(1)+'" fill="'+T.person+'"/>'});
      }
      if(hang){var tx1=sx+sw*0.2, tx2=sx+sw*0.8; o+=L(tx1,cy,tx1,sy,T.metal,1.6)+L(tx2,cy,tx2,sy,T.metal,1.6);}
      o+=R(sx,sy,sw,sh,T.screen);
      if(href) o+='<defs><clipPath id="'+id+'"><rect x="'+sx.toFixed(1)+'" y="'+sy.toFixed(1)+'" width="'+sw.toFixed(1)+'" height="'+sh.toFixed(1)+'"/></clipPath></defs><image href="'+href+'" x="'+sx.toFixed(1)+'" y="'+sy.toFixed(1)+'" width="'+sw.toFixed(1)+'" height="'+sh.toFixed(1)+'" preserveAspectRatio="xMidYMin slice" clip-path="url(#'+id+')"/>';
      if(MODE==='wall'){ // швы: ширина на схеме условная, но пропорции между 0,88 / 1,8 / 3,5 мм сохраняются
        var sw2=Math.max(1,0.5+st.seam*0.6);
        for(var c=1;c<st.cols;c++) o+=L(sx+sw*c/st.cols,sy,sx+sw*c/st.cols,sy+sh,T.screen,sw2);
        for(var rr=1;rr<st.rows;rr++) o+=L(sx,sy+sh*rr/st.rows,sx+sw,sy+sh*rr/st.rows,T.screen,sw2);
      }
      o+=R(sx,sy,sw,sh,'none',' stroke="'+T.screen+'" stroke-width="'+(MODE==='wall'?1.5:Math.max(2,0.012*s)).toFixed(1)+'"');
    }
    // размеры: ширина над экраном, высота слева
    var ty=sy-14; if(hang&&ty-18<cy) ty=sy+sh+18; o+=L(x0,ty,x0+sw,ty,T.dim,1)+L(x0,ty-4,x0,ty+4,T.dim,1)+L(x0+sw,ty-4,x0+sw,ty+4,T.dim,1)+Tx(x0+sw/2,ty-6,fmt(W)+' м','middle',T.text,500,13);
    var hx=x0-14; o+=L(hx,sy,hx,sy+sh,T.dim,1)+L(hx-4,sy,hx+4,sy,T.dim,1)+L(hx-4,sy+sh,hx+4,sy+sh,T.dim,1)+'<text x="'+(hx-6).toFixed(1)+'" y="'+(sy+sh/2).toFixed(1)+'" font-size="13" font-weight="500" fill="'+T.text+'" text-anchor="middle" font-family="Inter,Arial,sans-serif" transform="rotate(-90 '+(hx-6).toFixed(1)+' '+(sy+sh/2).toFixed(1)+')">'+fmt(H)+' м</text>';
    if(MODE!=='wall'&&st.qty>qty) o+=Tx(x0+rowW*s+8,sy+sh/2,'… всего '+st.qty+' шт','start',T.dim,400,12);
    if(MODE!=='wall'&&st.qty>1&&st.qty<=qty) o+='';
    // человек
    var ph=1.75*s, px=x0+(rowW+personGap)*s;
    o+='<g transform="translate('+px.toFixed(1)+','+(gy-ph).toFixed(1)+') scale('+(ph/100).toFixed(4)+')" fill="'+T.person+'"><circle cx="0" cy="9" r="9"/><path d="M-13 24h26v36h-6v40h-6V64h-2v36h-6V60h-6z"/></g>';
    if(!narrow) o+=Tx(px+20*ph/100+10,gy-ph+14,'Силуэт','start',T.dim,400,12)+Tx(px+20*ph/100+10,gy-ph+29,'175 см','start',T.dim,400,12);
    return o;
  }
  var last;
  function drawScene(){
    var svg=$('pb-svg'), box=svg.parentNode; if(!box.clientWidth||!last) return;
    var VW=Math.max(320,box.clientWidth), VH=Math.max(200,box.clientHeight);
    svg.setAttribute('viewBox','0 0 '+VW+' '+VH); svg.innerHTML=sceneSVG(VW,VH,last);
    svg.setAttribute('aria-label',(MODE==='wall'?'Схема: видеостена ':'Схема: панель ')+fmt(last.W)+' на '+fmt(last.H)+' м, '+MOUNT_LABEL[st.mount].toLowerCase()+', человек ростом 1,75 м');
  }

  // ——— Элементы управления ———
  function seg(box,vals,cur,label,attr,off){   // кнопки одинакового размера: до 5 в ряд, больше — в 2–3 ряда
    var rows=Math.ceil(vals.length/5), cols=Math.ceil(vals.length/rows);
    box.style.setProperty('--cols',cols);
    box.innerHTML=vals.map(function(v){var dis=off&&off.indexOf(v)>=0;return '<button type="button" data-'+attr+'="'+v+'" aria-pressed="'+(String(v)===String(cur))+'"'+(dis?' disabled title="Для этой диагонали такого шва нет"':'')+'>'+label(v)+'</button>'}).join('');
  }
  function renderControls(){
    fixState();
    seg($('pl-mount'),MOUNTS,st.mount,function(v){return MOUNT_LABEL[v]},'mount');
    seg($('pl-diag'),diags(),st.diag,function(v){return fmt(v,0)+'″'},'diag');
    if(MODE==='wall'){var av=seams(); seg($('pl-seam'),SEAMS,st.seam,function(v){return fmt(v)+' мм'},'seam',SEAMS.filter(function(x){return av.indexOf(x)<0}));}
    [].forEach.call($('pl-orient').querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',String(b.dataset.orient===st.orient))});
    [].forEach.call($('pl-kind').querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',String(b.dataset.kind===st.kind))});
  }
  var inp={c:[$('pl-c-r'),$('pl-c')],r:[$('pl-r-r'),$('pl-r')]};
  function sync(){
    var key=MODE==='wall'?'cols':'qty';
    inp.c.forEach(function(x){if(document.activeElement!==x) x.value=st[key]});
    inp.r.forEach(function(x){if(document.activeElement!==x) x.value=st.rows});
  }
  function render(){
    var r=last=calc(st); sync();
    if(!r){$('pl-size').textContent='—';$('pl-res').textContent='—';$('pl-money').textContent='По запросу';drawScene();return;}
    $('pl-count').textContent=MODE==='wall'?st.cols+' × '+st.rows+' = '+r.n+' '+panelWord(r.n):r.n+' шт';
    if(MODE==='wall'){
      $('pl-size-k').textContent='Размер видеостены'; $('pl-size').textContent=fmt(r.W)+' × '+fmt(r.H)+' м';
      $('pl-size-s').textContent='Диагональ около '+Math.round(r.diagIn)+'″, шов '+fmt(st.seam)+' мм';
      $('pl-money-s').textContent='Панели, с НДС.\nКрепление, контроллер и монтаж — отдельно.';
    } else {
      $('pl-size-k').textContent='Размер панели'; $('pl-size').textContent=fmt(r.pw/10,0)+' × '+fmt(r.ph/10,0)+' см';
      $('pl-size-s').textContent='Диагональ '+fmt(st.diag,0)+'″'+(st.kind==='touch'?', сенсорный экран':'');
      $('pl-money-s').textContent='Панели, с НДС.\n'+(st.kind==='touch'?'Компьютер и монтаж — отдельно.':'Крепление и монтаж — отдельно.');
    }
    $('pl-res').textContent=sp(r.resW)+' × '+sp(r.resH); $('pl-res-s').textContent=resLabel(r.resW,r.resH)+(r.count>1?' · '+r.count+' '+(r.count%10===1&&r.count%100!==11?'модель':r.count%10>=2&&r.count%10<=4&&(r.count%100<10||r.count%100>=20)?'модели':'моделей')+' в каталоге':'');
    $('pl-money').textContent=money(r.from,r.to);
    drawScene();
  }
  root.addEventListener('click',function(e){
    var b=e.target.closest('button[data-mount],button[data-diag],button[data-seam],button[data-kind],button[data-orient]'); if(!b||b.disabled) return;
    if(b.dataset.orient) st.orient=b.dataset.orient;
    if(b.dataset.mount) st.mount=b.dataset.mount;
    if(b.dataset.diag) st.diag=+b.dataset.diag;
    if(b.dataset.seam) st.seam=+b.dataset.seam;
    if(b.dataset.kind) st.kind=b.dataset.kind;
    renderControls(); render();
  });
  function bind(pair,key,max){
    pair.forEach(function(x){x.addEventListener('input',function(){var v=Math.round(+x.value);if(!v)return;st[key]=clamp(v,1,max);render()})});
    pair[1].addEventListener('change',function(){sync()});
  }
  if(MODE==='wall'){ bind(inp.c,'cols',8); bind(inp.r,'rows',6); }
  else {
    bind(inp.c,'qty',20); $('pl-row-r').hidden=true; $('pl-seam-box').hidden=true; $('pl-kind-box').hidden=false;
    $('pl-par-l').textContent='Количество'; $('pl-c-l').textContent='Панелей'; inp.c[1].setAttribute('aria-label','Количество панелей');
    inp.c.forEach(function(x){x.max=20}); $('pl-diag-l').textContent='Диагональ';
  }

  // ——— Заявка ———
  function payload(){
    var r=last;
    return {source:MODE==='wall'?'Подбор LCD-видеостены':'Подбор LCD-панелей',orientation:st.orient==='v'?'Вертикальная':'Горизонтальная',kind:MODE==='wall'?null:(st.kind==='touch'?'Интерактивные':'Обычные'),mount:MOUNT_LABEL[st.mount],
      diagonal_in:st.diag,seam_mm:MODE==='wall'?st.seam:null,layout:MODE==='wall'?st.cols+'×'+st.rows:null,panels:r?r.n:null,
      size_m:r?fmt(r.W)+'×'+fmt(r.H):null,resolution:r?r.resW+'×'+r.resH:null,budget:r?money(r.from,r.to)+' (панели, с НДС)':'по запросу',models:r?r.models:[]};
  }
  function rows(d){
    var a=[];
    if(d.kind) a.push(['Тип',d.kind]);
    a.push(['Установка',d.mount+', '+d.orientation.toLowerCase()+' ориентация']);
    a.push(['Панели',fmt(d.diagonal_in,0)+'″'+(d.seam_mm?', шов '+fmt(d.seam_mm)+' мм':'')+(d.layout?', раскладка '+d.layout.replace('×',' × '):'')+', '+d.panels+' шт']);
    if(d.size_m&&MODE==='wall') a.push(['Размер',d.size_m.replace('×',' × ')+' м']);
    a.push(['Разрешение',d.resolution?d.resolution.replace('x','×').replace('×',' × '):'—'],['Ориентир',d.budget]);
    return a;
  }
  var dlg=$('pb-dialog'), form=$('pb-form'), done=$('pb-done');
  $('pb-open').addEventListener('click',function(){
    $('pb-sum').innerHTML=rows(payload()).map(function(x){return '<dt>'+x[0]+'</dt><dd>'+x[1]+'</dd>'}).join('');
    form.hidden=false; done.hidden=true; dlg.showModal();
  });
  $('pb-close').addEventListener('click',function(){dlg.close()});
  dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var fd=new FormData(form), data=payload(), ok=true;
    data.name=fd.get('name'); data.contact=fd.get('contact'); data.task=fd.get('task'); data.request='Точный расчёт';
    function finish(){ form.hidden=true; done.hidden=false; done.textContent=ok?'Заявка принята. Инженер пришлёт расчёт с комплектацией в течение рабочего дня.':'Не удалось отправить. Позвоните +7 (499) 350-27-45 или напишите zakaz@ekranpro.ru.'; done.focus(); }
    if(FORM_ENDPOINT){ data.page=location.href; fetch(FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data)}).then(function(r){ok=r.ok},function(){ok=false}).then(finish); }
    else finish();
  });

  // ——— Закрепление: блок на один экран, как подбор LED ———
  function pin(){
    var on=window.innerWidth>=1000&&window.innerHeight>=600;
    root.classList.toggle('is-pinned',on);
    root.style.setProperty('--pb-vh',window.innerHeight+'px');
    var hdr=document.querySelector('#ekranpro-first-screen .ep1-header');
    root.style.setProperty('--pb-hdr',((hdr&&hdr.offsetHeight)||84)+'px');
    if(on){
      var cc=root.querySelector('.pb-controls'), cs=getComputedStyle(cc), kids=[].filter.call(cc.children,function(x){return !x.hidden&&x.tagName==='DIV'});
      var need=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+(kids.length-1)*10+kids.reduce(function(a,x){return a+x.offsetHeight},0);
      if(need>cc.clientHeight+1) root.classList.remove('is-pinned');
    }
  }
  var SEASON=['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'][new Date().getMonth()];
  var assetBase=$('pb-img-board').getAttribute('src').replace(/viewing-board\.webp.*$/,'');
  $('pb-img-screen').addEventListener('load',drawScene);
  $('pb-img-plain').addEventListener('load',drawScene);
  $('pb-img-screen').src=assetBase+'screen-'+SEASON+'.webp'; $('pb-img-plain').src=assetBase+'plain-'+SEASON+'.webp';
  renderControls(); render(); pin(); drawScene();
  var rt; window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){pin();drawScene()},120)});
  if(window.ResizeObserver) new ResizeObserver(function(){drawScene()}).observe($('pb-svg').parentNode);
  window.__pl={calc:calc,money:money,MODELS:MODELS};
})();
