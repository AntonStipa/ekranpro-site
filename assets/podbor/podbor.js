/* Блок «Подбор экрана»: расчёт шага пикселя по правилам системы КП, схема, заявка. Данные моделей — в #pb-data. */
(function(){
  'use strict';
  var FORM_ENDPOINT=''; // адрес обработчика формы; пусто = демонстрационный режим, как в catalog.js
  var MODELS=JSON.parse(document.getElementById('pb-data').textContent);

  // ——— Правила из системы расчёта КП (lib/quote/pitch-level.ts, настройки по умолчанию) ———
  var COEF={standard:1,optimal:1.4,max:2};      // расчётный шаг, мм = расстояние, м ÷ коэффициент
  var TOL={out:0.05,in:0};                      // допуск превышения расчётного шага по среде
  var LEVELS=['standard','optimal','max'];
  var LEVEL_LABEL={standard:'Стандартное качество',optimal:'Оптимальное качество',max:'Максимальное качество',below:'Ниже стандарта'};
  var LEVEL_HINT={standard:'Точки видны, но мелкие',optimal:'Точки едва заметны',max:'Точек не видно, как у телевизора',below:'Точки заметны'};
  var LEVEL_COLOR={below:'#E31E24',standard:'#e8a317',optimal:'#7cb342',max:'#1fa84d'};
  var NAV={distance:3,pitch:{standard:2.5,optimal:2,max:1.86},ceilGap:1,hangers:2,inset:0.25};
  var EPS=1e-9;
  var MOUNT_LABEL={wall:'На стену',structure:'На конструкцию',suspended:'На подвес'};
  var LIMITS={out:{w:[1,40,0.1],h:[1,20,0.1],d:[2,100,1],lift:[0,30,0.5]},
              in:{w:[0.5,15,0.1],h:[0.5,8,0.1],d:[1,20,0.5],lift:[0,6,0.1]}};

  // Место установки: типовые размер, расстояние, высота низа экрана; что рисует схема; из каких моделей считать
  var PLACES={
    out:[
      {id:'facade',ctx:'facade',name:'Фасад здания',w:6,h:3,d:10,lift:3,pool:'out',icon:'<path d="M5 26V6h24v20M3 26h28"/><rect x="11" y="10" width="12" height="7"/>'},
      {id:'freestanding',ctx:'pole',name:'Отдельная конструкция',w:6,h:3,d:8,lift:4,pool:'out',support:true,icon:'<rect x="5" y="4" width="24" height="12"/><path d="M17 16v10M12 26h10"/>'},
      {id:'roof',ctx:'roof',name:'Крыша здания',w:8,h:4,d:14,lift:12,pool:'out',icon:'<path d="M6 26V14h22v12M3 26h28"/><rect x="9" y="4" width="16" height="7"/><path d="M12 11v3M22 11v3"/>'},
      {id:'stage',ctx:'stage',name:'Сцена',w:6,h:4,d:10,lift:1.5,pool:'rent_out',mounts:['structure'],hideMount:true,icon:'<rect x="8" y="4" width="18" height="12"/><path d="M8 16v6M17 16v6M26 16v6M4 22h26v4H4z"/>'},
      {id:'azs',ctx:'pylon',name:'Стела АЗС',w:1.6,h:4,d:6,lift:1,pool:'out',support:true,supportFull:true,icon:'<rect x="11" y="3" width="12" height="17"/><path d="M14 8h6M14 12h6M14 16h6M17 20v6M12 26h10"/>'},
      {id:'road',ctx:'road',name:'Дорожное табло',w:7,h:3,d:10,lift:5,pool:'out',support:true,icon:'<rect x="6" y="5" width="22" height="9"/><path d="M17 14v12M3 26h28M10 9.5h10m-3-2.5 3 2.5-3 2.5"/>'}
    ],
    in:[
      {id:'meeting',ctx:'room',furn:'office',name:'Переговорная / диспетчерская',w:3,h:1.7,d:2,lift:1,pool:'in',mounts:['wall','structure'],maxPitch:1.87,icon:'<rect x="7" y="4" width="20" height="11"/><path d="M5 21h24M9 21v5M25 21v5"/>'},
      {id:'lobby',ctx:'room',furn:'plant',name:'Холл / ресепшн',w:4,h:2.25,d:3,lift:1,pool:'in',icon:'<rect x="6" y="4" width="22" height="11"/><path d="M9 26v-6h16v6M4 26h26"/>'},
      {id:'retail',ctx:'room',furn:'plant',name:'Торговый зал',w:3,h:2,d:3,lift:1.5,pool:'in',icon:'<rect x="5" y="4" width="14" height="10"/><path d="M22 26V10h7v16M4 26h26M22 15h7M22 20h7"/>'},
      {id:'hall',ctx:'room',furn:'stage',name:'Зал / сцена',w:6,h:3.5,d:8,lift:1,pool:'in',mounts:['wall','suspended','structure'],icon:'<rect x="7" y="4" width="20" height="12"/><path d="M4 20h26v6H4z"/>'},
      {id:'nav',ctx:'room',name:'Навигационный указатель',w:1.92,h:0.32,d:3,lift:2.2,pool:'nav',mounts:['suspended'],fixedMount:'На подвесе, в метре от потолка',nav:true,icon:'<path d="M3 4h28M11 4v7M23 4v7"/><rect x="5" y="11" width="24" height="8"/><path d="M10 15h8m-3-2.5 3 2.5-3 2.5"/>'},
      {id:'transp',ctx:'room',furn:'plant',name:'Прозрачный экран',w:3,h:2,d:4,lift:0.5,pool:'transp',icon:'<rect x="5" y="5" width="24" height="16" stroke-dasharray="3 2.5"/><path d="M9 17l8-8M15 17l8-8M3 26h28"/>'}
    ]
  };

  var st={view:'calc',touched:false,env:'out',place:'facade',mount:null,w:6,h:3,d:10,lift:3,pick:null,navSize:null,dbl:false};
  var $=function(id){return document.getElementById(id)};
  var el={places:$('pb-places'),area:$('pb-area'),svg:$('pb-svg'),pitch:$('pb-pitch'),pitchS:$('pb-pitch-s'),res:$('pb-res'),resS:$('pb-res-s'),
    money:$('pb-money'),moneyK:$('pb-money-k'),moneyS:$('pb-money-s'),mountBox:$('pb-mount-box'),mount:$('pb-mount'),mountFixed:$('pb-mount-fixed'),
    navBox:$('pb-nav-box'),navSize:$('pb-nav-size'),navDbl:$('pb-nav-dbl'),rowW:$('pb-row-w'),rowH:$('pb-row-h'),liftL:$('pb-lift-l'),
    tiles:$('pb-tiles'),why:$('pb-why'),
    dialog:$('pb-dialog'),sum:$('pb-sum'),form:$('pb-form'),done:$('pb-done')};
  var inp={w:[$('pb-w-r'),$('pb-w')],h:[$('pb-h-r'),$('pb-h')],lift:[$('pb-lift-r'),$('pb-lift')]};

  function fmt(v,dg){var s=(+v).toFixed(dg==null?2:dg);if(s.indexOf('.')>=0)s=s.replace(/0+$/,'').replace(/\.$/,'');return s.replace('.',',')}
  function sp(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
  function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
  function place(){return PLACES[st.env].filter(function(p){return p.id===st.place})[0]}
  function uniq(a){return a.filter(function(v,i){return a.indexOf(v)===i}).sort(function(x,y){return x-y})}

  // ——— Подбор шага: как pickPitchForLevel / levelOfPitch в КП-системе ———
  function pickPitch(d,avail,coef,tol){
    var cap=d/coef*(1+tol)+EPS, fit=avail.filter(function(p){return p<=cap});
    return fit.length?Math.max.apply(null,fit):Math.min.apply(null,avail);
  }
  function levelOf(d,pitch,tol){
    var k=d/pitch*(1+tol)+EPS;
    return k>=COEF.max?'max':k>=COEF.optimal?'optimal':k>=COEF.standard?'standard':'below';
  }
  function money(a,b){
    function part(v,unit,up){var k=unit==='млн'?1e6:1e3, x=v/k; return unit==='млн'?(up?Math.ceil(x*10)/10:Math.floor(x*10)/10):(up?Math.ceil(x/10)*10:Math.floor(x/10)*10)}
    var unit=b>=1e6?'млн':'тыс.';
    var x=part(a,unit,false), y=part(b,unit,true);
    var f=function(v){return unit==='млн'?(v>=100?fmt(v,0):v.toFixed(1).replace('.',',')):sp(v)};
    if(x<=0) x=unit==='млн'?0.1:10;
    if(a===b||f(x)===f(y)) return 'от '+f(x)+' '+unit+' ₽';
    return f(x)+' — '+f(y)+' '+unit+' ₽';
  }

  // Чистая функция расчёта: состояние → карточки шага с вилкой. Переносится на Next.js без изменений.
  function calc(s,p){
    var tol=TOL[s.env], area=s.w*s.h, cards=[];
    if(p.nav){
      var size=s.navSize;
      LEVELS.forEach(function(lv){
        var m=MODELS.filter(function(x){return x.pool==='nav'&&x.size===size&&Math.abs(x.pitch-NAV.pitch[lv])<1e-6})[0];
        if(!m)return;
        var price=s.dbl&&m.price2?m.price2:m.price;
        cards.push({level:lv,pitch:m.pitch,k:COEF[lv],rec:lv==='optimal',from:price,to:price,models:[m.sku],piece:true});
      });
    } else {
      var pool=MODELS.filter(function(m){return m.pool===p.pool&&(!p.maxPitch||m.pitch<=p.maxPitch+1e-6)});
      var avail=uniq(pool.map(function(m){return m.pitch}));
      if(avail.length){
        var lv={}, seen=[];
        LEVELS.forEach(function(l){lv[l]=pickPitch(s.d,avail,COEF[l],tol)});
        LEVELS.forEach(function(l){
          var pitch=lv[l]; if(seen.indexOf(pitch)>=0)return; seen.push(pitch);
          // вилка: все модели каталога с этим шагом
          var list=pool.filter(function(m){return Math.abs(m.pitch-pitch)<1e-6}).sort(function(a,b){return a.price-b.price});
          cards.push({level:levelOf(s.d,pitch,tol),pitch:pitch,k:s.d/pitch*(1+tol),rec:Math.abs(pitch-lv.optimal)<1e-6,
            from:area*list[0].price,to:area*list[list.length-1].price,models:[list[0].sku,list[list.length-1].sku].filter(function(v,i,a){return a.indexOf(v)===i})});
        });
      }
    }
    var sel=cards.filter(function(c){return s.pick!=null&&Math.abs(c.pitch-s.pick)<1e-6})[0]||cards[0]||null; // по умолчанию — стандартный шаг: 1 мм на 1 м расстояния
    return {area:area,cards:cards,sel:sel,resW:sel?Math.round(s.w*1000/sel.pitch):0,resH:sel?Math.round(s.h*1000/sel.pitch):0};
  }
  function resNote(r){
    var px=Math.min(r.resW*9/16,r.resH);
    if(px>=2160) return 'Хватит для видео 4K';
    if(px>=1080) return 'Хватит для видео Full HD';
    if(px>=720) return 'Хватит для видео HD';
    if(px>=360) return 'Видео, графика и крупный текст';
    return 'Крупная графика и короткие надписи';
  }

  // ——— Схема: экран привязан к зданию, опоре или стене; человек 1,75 м в том же масштабе ———
  var T={bg:'#e8ebe8',room:'#dcdfdb',floor:'#c4c8c4',ground:'#d8dad7',groundLine:null,wall:'#d2d5d1',wallStroke:null,wallAlt:'#b0b5b0',win:'#e2e5e1',winStroke:null,metal:'#a3a8a4',metalStroke:null,
       screen:'#171a1c',onScreen:'#ffffff',dots:true,glow:false,person:'#171a1c',dim:'#60656a',text:'#171a1c',mute:'#60656a',labelBg:'#e8ebe8'}; // оформление схемы: серый фон, графитовый экран
  var sceneGeom={k:1,broken:false};
  var measureCtx=document.createElement('canvas').getContext('2d');
  function textW(t,font){ if(!measureCtx) return t.length*7.4; measureCtx.font=font; return measureCtx.measureText(t).width+2; }
  function postCount(w){var cab=Math.max(1,Math.round(w/0.6));return Math.max(1,Math.floor(cab/2))+1} // стойка через каждые два кабинета 600 мм
  function drawScene(){
    var svg=el.svg, box=svg.parentNode, p=place();
    if(!box.clientWidth) return; // вид скрыт
    var VW=Math.max(320,box.clientWidth), VH=Math.max(200,box.clientHeight);
    svg.setAttribute('viewBox','0 0 '+VW+' '+VH);
    svg.innerHTML=sceneSVG(VW,VH,'pb');
    svg.setAttribute('aria-label','Схема: '+p.name.toLowerCase()+', экран '+fmt(st.w)+' на '+fmt(st.h)+' м на высоте '+fmt(st.lift)+' м, расстояние просмотра '+fmt(st.d,1)+' м, человек ростом 1,75 м');
  }
  function sceneSVG(VW,VH,uid){
    var p=place(), narrow=VW<520;
    var c={w:st.w,h:st.h,lift:st.lift,d:st.d,ctx:p.ctx,mount:p.ctx==='room'?(st.mount||'wall'):null,furn:p.furn,nav:!!p.nav};
    var capA='Расстояние просмотра', capH='рост человека 175 см', wA=textW(capA,'500 13px Inter,Arial,sans-serif'), wH=textW(capH,'400 12px Inter,Arial,sans-serif');
    var padL=narrow?46:64, padR=narrow?30:Math.max(52,wH+26), top=30, gy=VH-(narrow?74:52);
    var hung=c.mount==='suspended', ceilM=c.ctx==='room'?(hung?c.lift+c.h+1:Math.max(c.lift+c.h+0.6,3)):0;
    var mL=0,mR=0,ctxH=c.lift+c.h;
    var floors=Math.max(2,Math.ceil((c.lift+c.h+0.6)/3)), sideCols=c.w>12?2:1;
    if(c.ctx==='facade'){mL=mR=sideCols*2.4+0.5;ctxH=floors*3+0.5}
    if(c.ctx==='roof'){mL=2.5;mR=2.5}
    if(c.ctx==='stage'){mL=1.2;mR=1.2;ctxH=c.lift+c.h+0.9}
    if(c.ctx==='road'){mL=0.5;mR=0.5}
    if(c.ctx==='pylon'){ctxH=c.lift+c.h+0.9}
    if(c.ctx==='room'){mL=c.furn==='stage'?1.5:c.nav?1.2:2.4;ctxH=ceilM}
    var sceneH=Math.max(ctxH,2.1), zone=(VW-padL-padR)*0.52;
    var s=Math.min((gy-top)/sceneH,zone/(mL+c.w+mR),64);
    var sx=padL+mL*s, sw=c.w*s, sh=c.h*s, sy=gy-(c.lift+c.h)*s, sb=sy+sh, ctxR=sx+sw+mR*s;
    // размерная линия высоты: у сцены — левее помоста, в помещении — рядом с экраном, иначе у левого края
    var lx=c.ctx==='stage'?padL-0.4*s-20:(c.ctx==='room'&&c.furn!=='stage'?sx-22:padL-18), leftMost=c.lift>0?lx-40:padL-10;
    var plantX=c.lift>0?lx-44-0.5*s:sx-0.95*s, plant=(c.furn==='office'||c.furn==='plant')&&plantX-0.5*s>padL-40; // растение левее размерной линии
    if(plant) leftMost=Math.min(leftMost,plantX-0.5*s);
    var capL=sx+sw-12-wA, needL=narrow?0:Math.max(0,8-Math.min(capL-6,leftMost)); // сколько места занимает всё, что левее поля схемы
    var want=sx+sw+c.d*s, maxX=VW-padR-needL, px=Math.min(Math.max(want,sx+sw+44),maxX), broken=want>maxX+1;
    var ph=1.75*s, o='', i;
    function R(x,y,w,h,fill,stroke,extra){return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(w,0).toFixed(1)+'" height="'+Math.max(h,0).toFixed(1)+'" fill="'+(fill||'none')+'"'+(stroke?' stroke="'+stroke+'" stroke-width="1"':'')+(extra||'')+'/>'}
    function L(x1,y1,x2,y2,stc,w,dash){return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+stc+'" stroke-width="'+(w||1)+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>'}
    function Tx(x,y,t,anchor,color,weight,size){return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="'+(size||12)+'" fill="'+(color||T.text)+'" text-anchor="'+(anchor||'middle')+'"'+(weight?' font-weight="'+weight+'"':'')+'>'+t+'</text>'}
    function windows(x,y,w,h){ // окна сеткой: этаж 3 м, шаг 2,4 м
      var out='', fl=3*s, ww=1.2*s, wh=1.5*s, step=2.4*s, n=Math.floor((w-0.8*s)/step), ox=x+(w-(n-1)*step-ww)/2;
      for(var yy=y+h-fl+0.8*s; yy>y+0.3*s; yy-=fl) for(var q=0;q<n;q++) out+=R(ox+q*step,yy,ww,wh,T.win,T.winStroke);
      return out;
    }
    o+='<defs><pattern id="'+uid+'-dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.3" fill="#fff" fill-opacity=".3"/></pattern>'+
       '<filter id="'+uid+'-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18"/></filter></defs>';
    // фон на всю ширину схемы (не сдвигается при центровке)
    var bg=o+R(0,0,VW,VH,T.bg), room=c.ctx==='room', floorFill=room?T.floor:T.ground; o='';
    if(room){ // стена и пол темнее стены; линия потолка — только у навигационного указателя
      bg+=R(0,0,VW,gy,T.room);
      if(c.nav){ var cy=gy-ceilM*s; bg+=R(0,0,VW,cy,T.bg)+L(0,cy,VW,cy,T.dim,1.2); }
    }
    bg+=R(0,gy,VW,VH-gy,floorFill);
    // улица
    if(c.ctx==='facade'){
      var wy0=gy-ctxH*s;
      o+=R(padL,wy0,ctxR-padL,gy-wy0,T.wall,T.wallStroke);
      // окна по этажам (3 м): колонки слева и справа от экрана всегда, над и под экраном — где не перекрыты
      var ww=1.2*s, wh=1.5*s, mid=Math.max(1,Math.round(c.w/2.4)), cols=[];
      for(i=0;i<sideCols;i++){cols.push({x:sx-(i+1)*2.4*s+0.6*s,side:true});cols.push({x:sx+sw+i*2.4*s+0.6*s,side:true})}
      for(i=0;i<mid;i++) cols.push({x:sx+sw*(i+0.5)/mid-ww/2,side:false});
      for(var f=0;f<floors;f++){
        var wy=gy-(f*3+2.4)*s;
        cols.forEach(function(cl){ if(!cl.side&&wy+wh>sy-0.3*s&&wy<sb+0.3*s) return; o+=R(cl.x,wy,ww,wh,T.win,T.winStroke); });
      }
    }
    if(c.ctx==='roof'){
      var leg=Math.min(0.6,c.lift)*s, by=sb+leg, lw=Math.max(2,0.12*s);
      o+=R(padL,by,ctxR-padL,gy-by,T.wall,T.wallStroke)+windows(padL,by,ctxR-padL,gy-by);
      o+=R(sx+sw*0.12,sb,lw,leg,T.metal,T.metalStroke)+R(sx+sw*0.88-lw,sb,lw,leg,T.metal,T.metalStroke);
    }
    if(c.ctx==='pole'){
      var pw=Math.max(c.w/15*s,6), bh=Math.max(3,0.15*s);
      o+=R(sx+sw/2-pw/2,sb,pw,gy-sb,T.metal,T.metalStroke)+R(sx+sw/2-pw*1.6,gy-bh,pw*3.2,bh,T.metal,T.metalStroke);
    }
    if(c.ctx==='pylon') o+=R(sx,sb,sw,gy-sb,T.metal,T.metalStroke)+R(sx,sy-0.7*s,sw,0.7*s,T.metal,T.metalStroke);
    if(c.ctx==='road'){ // одна опора слева и балка под экраном
      var rw=Math.max(0.3*s,4);
      o+=R(sx-rw,sy-0.3*s,rw,gy-sy+0.3*s,T.metal,T.metalStroke)+R(sx-rw,sb,sw+rw,Math.max(0.25*s,3),T.metal,T.metalStroke);
    }
    if(c.ctx==='stage'){
      var tw=Math.max(0.35*s,4), ty=gy-ctxH*s, pl=Math.min(c.lift,1.2)*s;
      o+=R(padL,ty,tw,gy-ty,T.metal,T.metalStroke)+R(ctxR-tw,ty,tw,gy-ty,T.metal,T.metalStroke)+R(padL,ty,ctxR-padL,tw,T.metal,T.metalStroke);
      o+=R(padL-0.4*s,gy-pl,ctxR-padL+0.8*s,pl,T.wall,T.wallStroke);
      o+=L(sx+sw*0.25,ty+tw,sx+sw*0.25,sy,T.metalStroke||T.metal,1.5)+L(sx+sw*0.75,ty+tw,sx+sw*0.75,sy,T.metalStroke||T.metal,1.5);
    }
    // помещение: обстановка
    var F=T.metal, FS=T.metalStroke, base=gy; // base — уровень, на котором стоит конструкция
    if(c.furn==='stage'){ // помост сцены под экраном
      var ph0=Math.min(1,Math.max(0.3,c.lift-0.4),c.lift)*s, plx=Math.max(padL-6,sx-1.2*s);
      if(ph0>1){o+=R(plx,gy-ph0,sx+sw+1.2*s-plx,ph0,T.wallAlt,T.wallStroke); base=gy-ph0}
    }
    if(plant){ // растение слева от экрана
      var pxp=plantX, pw2=0.42*s, phh=0.42*s;
      {
        o+=R(pxp-pw2/2,gy-phh,pw2,phh,F,FS);
        [[-0.34,-0.55,-28],[0.34,-0.55,28],[-0.16,-0.85,-10],[0.16,-0.85,10],[0,-1.05,0]].forEach(function(lf){
          var lx=pxp+lf[0]*s, ly=gy-phh+lf[1]*s+0.12*s;
          o+='<ellipse cx="'+lx.toFixed(1)+'" cy="'+ly.toFixed(1)+'" rx="'+(0.13*s).toFixed(1)+'" ry="'+(0.36*s).toFixed(1)+'" transform="rotate('+lf[2]+' '+lx.toFixed(1)+' '+ly.toFixed(1)+')" fill="'+F+'"'+(FS?' stroke="'+FS+'" stroke-width="1"':'')+'/>';
        });
      }
    }
    if(c.furn==='office'&&c.mount==='wall'&&c.lift>=0.85&&c.w>=1.6){ // стол переговорной со стульями — под экраном
      var tl=Math.min(2.2,c.w-0.9)*s, tx=sx+(sw-tl)/2, th=Math.max(0.06*s,2), lg=Math.max(0.07*s,2);
      var chair=function(x,dir){return R(x,gy-0.82*s,lg,0.82*s,F,FS)+R(dir>0?x:x-0.42*s+lg,gy-0.47*s,0.42*s,th,F,FS)+R(dir>0?x+0.42*s-lg:x-0.42*s+lg,gy-0.47*s,lg,0.47*s,F,FS)};
      o+=chair(tx-0.25*s,1)+chair(tx+tl+0.25*s-lg,-1);
      o+=R(tx,gy-0.75*s,tl,th,F,FS)+R(tx+0.25*s,gy-0.75*s,lg,0.75*s,F,FS)+R(tx+tl-0.25*s-lg,gy-0.75*s,lg,0.75*s,F,FS);
    }
    // помещение: стойки конструкции или тросы подвеса
    if(c.ctx==='room'&&c.mount==='structure'&&sb<base-1){
      var n=postCount(c.w), q=Math.max(0.08*s,2.5);
      for(i=0;i<n;i++){var cx=sx+q/2+i*(sw-q)/(n-1); o+=R(cx-q/2,sb,q,base-sb,F,FS)+R(cx-q*1.6,base-2.5,q*3.2,2.5,F,FS)}
    }
    if(c.ctx==='room'&&hung){
      var hy=c.nav?gy-ceilM*s:0; // без линии потолка тросы уходят за верх схемы
      (c.nav?[0.25,0.75]:[0.08,0.36,0.64,0.92]).forEach(function(t){o+=L(sx+sw*t,hy,sx+sw*t,sy,T.metalStroke||T.metal,1.5)});
    }
    // экран
    if(T.glow) o+=R(sx,sy,sw,sh,T.screen,null,' filter="url(#'+uid+'-glow)" opacity=".55"');
    o+=R(sx,sy,sw,sh,T.screen);
    if(T.dots) o+=R(sx,sy,sw,sh,'url(#'+uid+'-dots)');
    var label=fmt(c.w)+' × '+fmt(c.h)+' м';
    if(sw>78&&sh>26&&!c.nav) o+=Tx(sx+sw/2,sy+sh/2+4,label,'middle',T.onScreen,600,13);
    else if(hung){ o+=Tx(sx+sw/2,sb+17,label,'middle',T.text,600,12); if(c.nav) o+=Tx(sx+sw/2,sb+32,st.dbl?'двустороннее':'одностороннее','middle',T.mute,400,11); }
    else o+=Tx(sx+sw/2,sy-8-(c.ctx==='pylon'?0.7*s:0),label,'middle',T.text,600,12);
    // высота установки
    if(c.lift>0){
      o+=L(lx,sb,lx,gy,T.dim)+L(lx-4,sb,lx+4,sb,T.dim)+L(lx-4,gy,lx+4,gy,T.dim)+Tx(lx-6,(sb+gy)/2+4,fmt(c.lift)+' м','end',T.text,500,12);
    }
    // человек 1,75 м
    var drag=!c.nav&&uid==='pb', hw=Math.max(ph*0.13,6)+24;
    o+='<g'+(drag?' class="pb-person"':'')+'>'+(drag?'<title>Перетащите, чтобы изменить расстояние просмотра</title>':'')+
      R(px-hw-8,gy-ph-10,2*hw+16,ph+20,'rgba(0,0,0,0)')+
      '<g transform="translate('+px.toFixed(1)+','+(gy-ph).toFixed(1)+') scale('+(ph/100).toFixed(4)+')" fill="'+T.person+'"><circle cx="0" cy="9" r="9"/><path d="M-13 24h26v36h-6v40h-6V64h-2v36h-6V60h-6z"/></g>';
    if(drag){ var hyy=gy-Math.max(ph*0.5,14), ax=hw-3; // стрелки ‹ › по бокам, в цвет кнопки: человека можно двигать
      o+='<path class="pb-person-h" d="M'+(px-ax+8).toFixed(1)+' '+(hyy-9).toFixed(1)+'l-8 9 8 9M'+(px+ax-8).toFixed(1)+' '+(hyy-9).toFixed(1)+'l8 9-8 9" fill="none" stroke="#f36b52" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'; }
    o+='</g>';
    // линия взгляда и дистанция (с разрывом, если не помещается в масштабе)
    o+=L(sx+sw,sy+sh/2,px-ph*0.1,gy-ph*0.91,T.mute,1,'3 5');
    var ay=gy+25, midx=(sx+sw+px)/2, lw2=broken?74:54;
    o+=L(sx+sw,ay,px,ay,T.dim)+L(sx+sw,ay-5,sx+sw,ay+5,T.dim)+L(px,ay-5,px,ay+5,T.dim)+R(midx-lw2/2,ay-9,lw2,18,floorFill);
    if(broken) o+=L(midx-lw2/2+2,ay+5,midx-lw2/2+8,ay-5,T.dim)+L(midx+lw2/2-8,ay+5,midx+lw2/2-2,ay-5,T.dim);
    o+=Tx(midx,ay+4,fmt(c.d,1)+' м','middle',T.text,600,12);
    // центровка: вся композиция (здание или стена, экран, человек) встаёт по середине схемы
    var x0=Math.min(c.ctx==='stage'?padL-0.4*s-8:padL-10,leftMost), x1=px+hw+10; if(!narrow){ x0=Math.min(x0,capL-6); x1=Math.max(x1,px+12+wH+6); }
    var dx=Math.max(8-x0,(VW-(x1-x0))/2-x0);
    if(uid==='pb') sceneGeom={k:(px-(sx+sw))/c.d,broken:broken};
    // подписи у шкалы: слева — что она показывает, справа — рост человека; на узком экране — строкой под шкалой
    if(narrow) bg+='<text x="'+(VW/2).toFixed(1)+'" y="'+(ay+30).toFixed(1)+'" font-size="12" font-weight="500" text-anchor="middle" fill="'+T.text+'">'+capA+' <tspan font-weight="400" fill="'+T.mute+'">· '+capH+'</tspan></text>';
    else o+=Tx(sx+sw-12,ay+4.5,capA,'end',T.text,500,13)+Tx(px+12,ay+4,capH,'start',T.mute,400,12);
    return bg+'<g transform="translate('+dx.toFixed(1)+' 0)">'+o+'</g>';
  }

  // ——— Картинка «как увидит зритель»: перенос PixelTile и калибровки pixelLook из КП-системы ———
  function pixelLook(k){
    if(!(k>0)||k>=2) return {dots:0,grid:0};
    var dots,grid;
    if(k<1){dots=Math.max(8,107*k);grid=Math.min(1,0.255+(1-k)*1.3)}
    else if(k<1.4){dots=107*Math.pow(170/107,(k-1)/0.4);grid=0.255-(k-1)*0.3375}
    else{dots=170*Math.pow(2,(k-1.4)/0.6);grid=0.12-(k-1.4)*0.2}
    return {dots:Math.round(dots),grid:Math.max(0,grid)};
  }
  function drawTile(canvas,img,k){
    var S=600; canvas.width=S; canvas.height=S;
    var ctx=canvas.getContext('2d'); if(!ctx||!img.complete||!img.naturalWidth)return;
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    var look=pixelLook(k), dots=look.dots;
    if(dots<=0){ctx.drawImage(img,0,0,S,S);return}
    var small=document.createElement('canvas'); small.width=dots; small.height=dots;
    var sc=small.getContext('2d'); sc.imageSmoothingEnabled=true; sc.imageSmoothingQuality='high'; sc.drawImage(img,0,0,dots,dots);
    var data=sc.getImageData(0,0,dots,dots).data;
    ctx.drawImage(k>=1?img:small,0,0,S,S);
    if(look.grid>0){
      var led=document.createElement('canvas'); led.width=S; led.height=S;
      var lc=led.getContext('2d'); lc.fillStyle='#050505'; lc.fillRect(0,0,S,S);
      var cell=S/dots, r=cell*0.36;
      for(var y=0;y<dots;y++)for(var x=0;x<dots;x++){
        var i=(y*dots+x)*4;
        lc.fillStyle='rgb('+Math.min(255,data[i]*1.15)+','+Math.min(255,data[i+1]*1.15)+','+Math.min(255,data[i+2]*1.15)+')';
        lc.beginPath(); lc.arc(x*cell+cell/2,y*cell+cell/2,r,0,Math.PI*2); lc.fill();
      }
      ctx.globalAlpha=look.grid; ctx.drawImage(led,0,0); ctx.globalAlpha=1;
    }
  }
  var tileTimer;
  function paintTiles(){
    var img=$(place().nav?'pb-img-board':'pb-img-screen');
    el.tiles.querySelectorAll('canvas').forEach(function(c){drawTile(c,img,+c.dataset.k)});
  }

  function renderPlaces(){
    el.places.className='pb-places'+(PLACES[st.env].length>6?' pb-places--4':'');
    el.places.innerHTML=PLACES[st.env].map(function(p){
      return '<button type="button" class="pb-place" data-place="'+p.id+'" aria-pressed="'+(p.id===st.place)+'"><svg viewBox="0 0 34 30" aria-hidden="true">'+p.icon+'</svg><span>'+p.name+'</span></button>';
    }).join('');
  }
  function renderMount(){
    var p=place(), m=p.mounts||[];
    el.mountBox.hidden=!(m.length>1||p.fixedMount);
    el.mount.hidden=!(m.length>1); el.mountFixed.hidden=!p.fixedMount; el.mountFixed.textContent=p.fixedMount||'';
    el.mount.innerHTML=m.map(function(x){return '<button type="button" data-mount="'+x+'" aria-pressed="'+(x===st.mount)+'">'+MOUNT_LABEL[x]+'</button>'}).join('');
    el.navBox.hidden=!p.nav; el.rowW.hidden=!!p.nav; el.rowH.hidden=!!p.nav;
    el.liftL.textContent=p.support?'Высота опоры':'Высота установки';
    if(p.nav){
      var sizes=MODELS.filter(function(x){return x.pool==='nav'}).map(function(x){return x.size}).filter(function(v,i,a){return a.indexOf(v)===i});
      el.navSize.innerHTML=sizes.map(function(s){return '<option value="'+s+'"'+(s===st.navSize?' selected':'')+'>'+s+' мм</option>'}).join('');
      el.navDbl.checked=st.dbl;
    }
  }
  function syncInputs(){
    var L=LIMITS[st.env];
    ['w','h','lift'].forEach(function(key){
      var r=inp[key][0], n=inp[key][1], lim=L[key];
      r.min=lim[0]; r.max=lim[1]; r.step=lim[2]; n.min=lim[0]; n.max=lim[1];
      r.value=st[key]; if(document.activeElement!==n) n.value=st[key];
    });
  }
  var last;
  function render(){
    var p=place(), r=last=calc(st,p), c=r.sel;
    syncInputs();
    el.area.textContent=p.nav?'':fmt(r.area,r.area<10?2:1)+' м²';
    drawScene();
    if(c){
      el.pitch.textContent=fmt(c.pitch)+' мм';
      el.pitchS.textContent=LEVEL_LABEL[c.level];
      el.res.textContent=sp(r.resW)+' × '+sp(r.resH);
      el.resS.textContent=resNote(r);
      el.moneyK.textContent=c.piece?'Цена табло':'Бюджет оборудования';
      el.money.textContent=c.piece?sp(c.from)+' ₽':money(c.from,c.to);
      el.moneyS.textContent=c.piece?'За одно табло, с НДС.\nМонтаж считается отдельно.':'Только оборудование, с НДС.\nМонтаж считается отдельно.';
    } else {
      el.pitch.textContent='—'; el.pitchS.textContent='Подберёт инженер'; el.res.textContent='—'; el.resS.textContent='';
      el.moneyK.textContent='Бюджет оборудования'; el.money.textContent='По запросу'; el.moneyS.textContent='Прозрачные экраны\nсчитаем под проект.';
    }
    // рекомендации по шагу
    if(!r.cards.length){
      el.tiles.dataset.n='1'; $('pb-rec-body').dataset.n='0';
      el.tiles.innerHTML='<p class="pb-empty">Прозрачные экраны для помещений подбираем под проект: шаг и прозрачность зависят от остекления и расстояния просмотра. Оставьте заявку — инженер пришлёт варианты.</p>';
      el.why.hidden=true; $('pb-pdf').hidden=true; return;
    }
    el.why.hidden=false;
    $('pb-pdf').hidden=false;
    el.tiles.dataset.n=String(r.cards.length); el.tiles.dataset.kind=p.nav?'board':'screen'; $('pb-rec-body').dataset.n=String(r.cards.length);
    el.tiles.innerHTML=r.cards.map(function(x){
      var on=x===c;
      return '<button type="button" class="pb-tile" data-pitch="'+x.pitch+'" aria-pressed="'+on+'"><span class="pb-tile-l">'+LEVEL_LABEL[x.level]+'</span>'+
        '<span class="pb-tile-card"><span class="pb-tile-img"><span class="pb-tags">'+(x.rec?'<span class="pb-flag">Рекомендуем</span>':'')+(on?'<span class="pb-sel">Выбрано</span>':'')+'</span>'+
        '<canvas data-k="'+x.k+'" role="img" aria-label="Шаг '+fmt(x.pitch)+' мм. '+LEVEL_HINT[x.level]+'"></canvas></span>'+
        '<span class="pb-tile-b"><span class="pb-tile-p">Шаг пикселя '+fmt(x.pitch)+'\u00a0мм</span>'+
        '<span class="pb-tile-h"><span class="pb-dot" style="background:'+LEVEL_COLOR[x.level]+'"></span>'+LEVEL_HINT[x.level]+'</span></span></span></button>';
    }).join('');
    el.why.innerHTML=p.nav
      ?'<p>Изображение на табло складывается из светодиодных точек, и чем ближе зритель, тем они заметнее. Табло читают вблизи, примерно с 3 м, поэтому для них три шага:</p><ul><li><b>Стандартное качество</b> — 2,5 мм, точки видны.</li><li><b>Оптимальное качество</b> — 2 мм, точки едва различимы.</li><li><b>Максимальное качество</b> — 1,86 мм, картинка как у домашнего телевизора.</li></ul>'
      :'<p>Изображение на экране складывается из светодиодных точек, и чем ближе зритель, тем они заметнее. Поэтому шаг подбираем под расстояние просмотра:</p><ul><li><b>Стандартное качество</b> — шаг в миллиметрах равен расстоянию в метрах, точки видны.</li><li><b>Оптимальное качество</b> — шаг в 1,4 раза мельче, точки едва различимы.</li><li><b>Максимальное качество</b> — вдвое мельче, картинка как у домашнего телевизора.</li></ul>'+(p.maxPitch?'<p style="margin-top:8px">Для переговорных и диспетчерских шаг не крупнее 1,8 мм: на экране читают текст и таблицы.</p>':'');
    clearTimeout(tileTimer); tileTimer=setTimeout(paintTiles,90);
  }

  function applyPlace(p){
    st.place=p.id; st.w=p.w; st.h=p.h; st.d=p.d; st.lift=p.lift; st.pick=null; st.mount=(p.mounts||[])[0]||null; st.dbl=false;
    if(p.nav){ st.navSize=st.navSize||'1920×480'; setNavSize(st.navSize); st.d=NAV.distance; }
    renderPlaces(); renderMount(); render();
  }
  function setNavSize(v){var a=v.split('×'); st.navSize=v; st.w=+a[0]/1000; st.h=+a[1]/1000}
  document.querySelector('.pb-seg').addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b)return; touch(); if(b.dataset.env===st.env)return;
    st.env=b.dataset.env;
    document.querySelectorAll('.pb-seg button').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.env===st.env))});
    applyPlace(PLACES[st.env][0]);
  });
  el.places.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b)return; touch();
    applyPlace(PLACES[st.env].filter(function(p){return p.id===b.dataset.place})[0]);
  });
  el.mount.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b)return; touch();
    st.mount=b.dataset.mount; st.lift=st.mount==='suspended'?3:place().lift; // подвес висит выше: 3 м, как в КП-системе
    renderMount(); render();
  });
  el.navSize.addEventListener('change',function(){touch();setNavSize(el.navSize.value);render()});
  el.navDbl.addEventListener('change',function(){touch();st.dbl=el.navDbl.checked;render()});
  el.tiles.addEventListener('click',function(e){var b=e.target.closest('.pb-tile');if(!b)return;st.pick=+b.dataset.pitch;render()});
  ['w','h','lift'].forEach(function(key){
    var range=inp[key][0], num=inp[key][1];
    range.addEventListener('input',function(){touch();st[key]=+range.value;render()});
    num.addEventListener('input',function(){
      var v=parseFloat(String(num.value).replace(',','.')), L=LIMITS[st.env][key];
      if(!isFinite(v))return; touch(); st[key]=Math.round(clamp(v,L[0],L[1])*100)/100; render();
    });
    num.addEventListener('blur',function(){num.value=st[key]});
  });

  // ——— Заявка: параметры и выбранный вариант уходят вместе с контактом ———
  function touch(){ st.touched=true; $('pb-hint').hidden=true; }
  function payload(){
    var r=last, p=place(), c=r.sel;
    return {source:'Подбор экрана',env:st.env==='out'?'На улице':'В помещении',place:p.name,mount:st.mount?MOUNT_LABEL[st.mount]:null,
      width_m:st.w,height_m:st.h,area_m2:Math.round(r.area*100)/100,install_height_m:st.lift,distance_m:st.d,double_sided:p.nav?st.dbl:null,
      pitch_mm:c?c.pitch:null,quality:c?LEVEL_LABEL[c.level]:null,resolution:c?r.resW+'×'+r.resH:null,
      budget:c?(c.piece?sp(c.from)+' ₽ за табло':money(c.from,c.to)+' (только оборудование, с НДС)'):'по запросу',models:c?c.models:[]};
  }
  function summaryRows(d){
    return [['Место',d.env+', '+d.place.toLowerCase()+(d.mount?', '+d.mount.toLowerCase():'')],
      ['Экран',fmt(d.width_m)+' × '+fmt(d.height_m)+' м'+(d.double_sided==null?', '+fmt(d.area_m2)+' м²':d.double_sided?', двустороннее':', одностороннее')],
      ['Высота установки',fmt(d.install_height_m)+' м'],['Расстояние просмотра',fmt(d.distance_m,1)+' м'],
      ['Шаг пикселя',d.pitch_mm?fmt(d.pitch_mm)+' мм, '+d.quality.toLowerCase():'подберёт инженер'],['Ориентир',d.budget]];
  }
  // Одно окно на два сценария: заявка на расчёт и скачивание PDF (оба просят контакт)
  var DLG={quote:{title:'Расчёт за 24 часа',btn:'Получить расчёт',note:'Бесплатно, без обязательств. Ответит инженер, не менеджер по продажам.'},
           pdf:{title:'Скачать расчёт в PDF',btn:'Скачать PDF',note:'В файле: параметры экрана, схема, шаг пикселя, бюджет оборудования и рекомендации. Скачивание начнётся после отправки.'}};
  var dlgMode='quote';
  function openDialog(mode){
    dlgMode=mode; var m=DLG[mode];
    $('pb-dlg-t').textContent=m.title; $('pb-f-btn').textContent=m.btn; $('pb-f-note').textContent=m.note;
    $('pb-f-task-l').hidden=mode==='pdf';
    el.sum.innerHTML=summaryRows(payload()).map(function(x){return '<dt>'+x[0]+'</dt><dd>'+x[1]+'</dd>'}).join('');
    el.form.hidden=false; el.done.hidden=true;
    el.dialog.showModal();
  }
  $('pb-open').addEventListener('click',function(){openDialog('quote')});
  $('pb-pdf').addEventListener('click',function(){openDialog('pdf')});
  $('pb-close').addEventListener('click',function(){el.dialog.close()});
  el.dialog.addEventListener('click',function(e){if(e.target===el.dialog)el.dialog.close()});
  el.form.addEventListener('submit',function(e){
    e.preventDefault();
    var fd=new FormData(el.form), data=payload(), mode=dlgMode;
    data.name=fd.get('name');data.contact=fd.get('contact');data.task=mode==='pdf'?'':fd.get('task');data.request=mode==='pdf'?'Скачивание PDF':'Точный расчёт';
    var ok=true;
    function finish(){
      el.form.hidden=true; el.done.hidden=false;
      if(mode==='pdf'){
        el.done.innerHTML='<p>Готовим файл…</p>';
        makePdf(data).then(function(blob){
          savePdf(blob);
          el.done.innerHTML='<p>PDF скачивается. Если загрузка не началась, нажмите кнопку ниже.</p><button type="button" class="pb-link pb-link--inline" id="pb-pdf-again"><span>Скачать ещё раз</span></button>';
          $('pb-pdf-again').addEventListener('click',function(){savePdf(blob)});
        },function(){ el.done.innerHTML='<p>Не удалось собрать PDF в этом браузере. Позвоните +7 (499) 350-27-45 или напишите zakaz@ekranpro.ru — пришлём расчёт письмом.</p>'; });
      } else {
        el.done.textContent=ok?'Заявка принята. Инженер пришлёт расчёт с комплектацией в течение рабочего дня.':'Не удалось отправить. Позвоните +7 (499) 350-27-45 или напишите zakaz@ekranpro.ru.';
      }
      el.done.focus();
    }
    if(FORM_ENDPOINT){
      data.page=location.href;
      fetch(FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data)})
        .then(function(r){ok=r.ok},function(){ok=false}).then(finish);
    } else finish();
  });

  // ——— PDF: один лист A4, собирается в браузере (шапка и реквизиты как в КП) ———
  var COMPANY={legal:'ООО «Рекламная группа «ОнЛаб»',inn:'6658363893',site:'www.ekranpro.ru',phone:'+7 (499) 350-27-45',email:'zakaz@ekranpro.ru',address:'г. Москва, БП Румянцево, корпус Г, оф. 413'};
  function loadImage(src){return new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im)};im.onerror=rej;im.src=src})}
  function makePdf(lead){
    var W=1654,H=2339,MM=W/210,M=Math.round(15*MM),CW=W-2*M; // A4 при 200 dpi, поля 15 мм
    var r=last,p=place(),c=r.sel,d=payload();
    var cv=document.createElement('canvas'); cv.width=W; cv.height=H; var g=cv.getContext('2d');
    var FONT='Inter, Arial, sans-serif';
    function font(w,s){g.font=w+' '+s+'px '+FONT}
    function text(t,x,y,color,w,s,align){font(w,s);g.fillStyle=color;g.textAlign=align||'left';g.textBaseline='alphabetic';g.fillText(t,x,y)}
    function wrap(t,x,y,maxW,lh,color,w,s){font(w,s);g.fillStyle=color;g.textAlign='left';var words=t.split(' '),line='';
      words.forEach(function(wd){var tt=line?line+' '+wd:wd; if(g.measureText(tt).width>maxW&&line){g.fillText(line,x,y);y+=lh;line=wd}else line=tt});
      if(line){g.fillText(line,x,y);y+=lh} return y}
    var sw=1400, sh=440, svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+sw+'" height="'+sh+'" viewBox="0 0 900 '+Math.round(900*sh/sw)+'"><style>text{font-family:Arial,Helvetica,sans-serif}</style>'+sceneSVG(900,Math.round(900*sh/sw),'pdf')+'</svg>';
    var fonts=document.fonts&&document.fonts.load?Promise.all([document.fonts.load('400 30px Inter'),document.fonts.load('500 30px Inter')]).catch(function(){}):Promise.resolve();
    return Promise.all([loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)),fonts]).then(function(a){
      var scene=a[0], INK='#171a1c', MUTE='#60656a', NAVY='#14263f';
      g.fillStyle='#fff'; g.fillRect(0,0,W,H);
      // шапка: тёмно-синее поле, зелёная диагональ, синее поле с логотипом
      var hh=Math.round(24*MM), sk=Math.tan(18*Math.PI/180)*hh/2;
      function band(x1,x2,color){g.fillStyle=color;g.beginPath();g.moveTo(x1+sk,0);g.lineTo(x2+sk,0);g.lineTo(x2-sk,hh);g.lineTo(x1-sk,hh);g.closePath();g.fill()}
      g.fillStyle=NAVY; g.fillRect(0,0,W,hh);
      band(W-56*MM,W+10*MM,'#2757d6'); band(W-58*MM,W-50*MM,'#1fa84d');
      text('Подбор светодиодного экрана',M,hh/2-4,'#fff','700',52);
      text('Параметры, схема и рекомендации по шагу пикселя',M,hh/2+44,'#c7d3e5','500',28);
      var logo=$('pb-img-logo');
      if(logo&&logo.complete&&logo.naturalWidth){var lh=Math.round(10*MM), lw=lh*logo.naturalWidth/logo.naturalHeight, lx=W-25*MM-lw/2; g.drawImage(logo,lx,(hh-lh)/2,lw,lh)}
      var y=hh+64;
      // кому и когда
      var now=new Date(), dd=('0'+now.getDate()).slice(-2)+'.'+('0'+(now.getMonth()+1)).slice(-2)+'.'+now.getFullYear();
      text('Расчёт от '+dd+(lead&&lead.name?' · для: '+String(lead.name).slice(0,60):''),M,y,MUTE,'400',26); y+=62;
      // параметры
      text('Параметры экрана',M,y,INK,'700',36); y+=50;
      var rows=summaryRows(d).slice(0,4), colW=CW/4;
      rows.forEach(function(row,i){var x=M+i*colW; text(row[0].toUpperCase(),x,y,MUTE,'500',19); wrap(row[1],x,y+38,colW-24,32,INK,'500',25)});
      y+=38+32*2+20;
      // схема
      g.drawImage(scene,M,y,CW,Math.round(CW*sh/sw)); y+=Math.round(CW*sh/sw);
      // шаг, разрешение, бюджет
      var bh=170; g.strokeStyle='#d8dad7'; g.lineWidth=2; g.strokeRect(M,y,CW,bh);
      var cols=[['ШАГ ПИКСЕЛЯ',c?fmt(c.pitch)+' мм':'—',c?LEVEL_LABEL[c.level]:'Подберёт инженер',INK],
                ['РАЗРЕШЕНИЕ',c?sp(r.resW)+' × '+sp(r.resH):'—',c?resNote(r):'',INK],
                [c&&c.piece?'ЦЕНА ТАБЛО':'БЮДЖЕТ ОБОРУДОВАНИЯ',c?(c.piece?sp(c.from)+' ₽':money(c.from,c.to)):'По запросу',c&&c.piece?'За одно табло, с НДС. Монтаж отдельно.':'Только экран, с НДС. Монтаж и работы отдельно.','#f36b52']];
      var cw3=[CW*0.27,CW*0.31,CW*0.42], cx=M;
      cols.forEach(function(k,i){ if(i){g.beginPath();g.moveTo(cx,y);g.lineTo(cx,y+bh);g.stroke()}
        text(k[0],cx+28,y+42,MUTE,'500',20); text(k[1],cx+28,y+100,k[3],'700',48); text(k[2],cx+28,y+142,MUTE,'400',22); cx+=cw3[i]; });
      y+=bh+64;
      // рекомендации
      if(r.cards.length){
        text('Рекомендации по выбору шага пикселя для дистанции '+fmt(st.d,1)+' м',M,y,INK,'700',36); y+=34;
        var gap=30, ts=Math.round((CW-2*gap)/3), img=$(p.nav?'pb-img-board':'pb-img-screen');
        r.cards.forEach(function(x,i){
          var tx=M+i*(ts+gap), tc=document.createElement('canvas'); drawTile(tc,img,x.k); g.drawImage(tc,tx,y,ts,ts);
          if(x.rec){font('500',20); var fw=g.measureText('РЕКОМЕНДУЕМ').width+28; g.fillStyle='#1fa84d'; g.fillRect(tx,y,fw,38); text('РЕКОМЕНДУЕМ',tx+14,y+27,'#fff','500',20)}
          if(x===c){g.strokeStyle=INK; g.lineWidth=4; g.strokeRect(tx+2,y+2,ts-4,ts-4)}
          var ty=y+ts+40;
          text(LEVEL_LABEL[x.level].toUpperCase(),tx,ty,MUTE,'500',19); ty+=44;
          text('Шаг пикселя '+fmt(x.pitch)+' мм',tx,ty,INK,'700',32); ty+=38;
          g.fillStyle=LEVEL_COLOR[x.level]; g.beginPath(); g.arc(tx+9,ty-8,9,0,Math.PI*2); g.fill();
          text(LEVEL_HINT[x.level],tx+30,ty,INK,'400',23); ty+=42;
          text(x.piece?sp(x.from)+' ₽ за табло, с НДС':money(x.from,x.to)+', только экран',tx,ty,INK,'500',24);
        });
        y+=ts+40+44+38+42+44;
        // пояснение
        var notes=p.nav
          ?['Изображение на табло складывается из светодиодных точек, и чем ближе зритель, тем они заметнее. Табло читают вблизи, примерно с 3 м, поэтому для них три шага:','Стандартное качество — 2,5 мм, точки видны.','Оптимальное качество — 2 мм, точки едва различимы.','Максимальное качество — 1,86 мм, картинка как у домашнего телевизора.']
          :['Изображение на экране складывается из светодиодных точек, и чем ближе зритель, тем они заметнее. Поэтому шаг подбираем под расстояние просмотра:','Стандартное качество — шаг в миллиметрах равен расстоянию в метрах, точки видны.','Оптимальное качество — шаг в 1,4 раза мельче, точки едва различимы.','Максимальное качество — вдвое мельче, картинка как у домашнего телевизора.'];
        var ny=y, nh=44+34*5+10; g.fillStyle='#eef1f6'; g.fillRect(M,ny,CW,nh);
        var yy=wrap(notes[0],M+30,ny+48,CW-60,34,INK,'400',24);
        notes.slice(1).forEach(function(n){ g.fillStyle=INK; g.beginPath(); g.arc(M+40,yy-8,4,0,Math.PI*2); g.fill(); yy=wrap(n,M+58,yy,CW-90,34,INK,'400',24); });
        y=ny+nh+44;
      }
      wrap('Расчёт ориентировочный: цена только за оборудование, с НДС. Точную стоимость под ключ с монтажом и пусконаладкой рассчитает инженер по заявке.',M,y,CW,32,MUTE,'400',23);
      // подвал с реквизитами
      var fy=H-Math.round(13*MM); g.strokeStyle='#d8dad7'; g.lineWidth=2; g.beginPath(); g.moveTo(M,fy); g.lineTo(W-M,fy); g.stroke();
      text(COMPANY.legal+'  (ИНН '+COMPANY.inn+')',M,fy+58,MUTE,'400',22);
      text(COMPANY.site+'     '+COMPANY.phone,W*0.615,fy+58,MUTE,'400',22,'center');
      text(COMPANY.email,W-M,fy+58,MUTE,'400',22,'right');
      text(COMPANY.address,M,fy-18,MUTE,'400',20);
      return pdfFromJpeg(cv.toDataURL('image/jpeg',0.9),W,H);
    });
  }
  // Минимальный PDF: одна страница A4 с одной JPEG-картинкой, без сторонних библиотек
  function pdfFromJpeg(dataUrl,w,h){
    var bin=atob(dataUrl.split(',')[1]), jpg=new Uint8Array(bin.length), i;
    for(i=0;i<bin.length;i++) jpg[i]=bin.charCodeAt(i);
    var enc=function(s){var a=new Uint8Array(s.length);for(var k=0;k<s.length;k++)a[k]=s.charCodeAt(k)&255;return a};
    var content='q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
    var objs=[enc('<</Type/Catalog/Pages 2 0 R>>'),enc('<</Type/Pages/Kids[3 0 R]/Count 1>>'),
      enc('<</Type/Page/Parent 2 0 R/MediaBox[0 0 595.28 841.89]/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>'),
      [enc('<</Type/XObject/Subtype/Image/Width '+w+'/Height '+h+'/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length '+jpg.length+'>>\nstream\n'),jpg,enc('\nendstream')],
      enc('<</Length '+content.length+'>>\nstream\n'+content+'\nendstream')];
    var parts=[enc('%PDF-1.4\n')], pos=parts[0].length, offs=[];
    objs.forEach(function(o,n){
      offs.push(pos);
      var chunk=[enc((n+1)+' 0 obj\n')].concat(o instanceof Uint8Array?[o]:o,[enc('\nendobj\n')]);
      chunk.forEach(function(x){parts.push(x);pos+=x.length});
    });
    var xref='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+offs.map(function(o){return ('0000000000'+o).slice(-10)+' 00000 n \n'}).join('')+
      'trailer\n<</Size '+(objs.length+1)+'/Root 1 0 R>>\nstartxref\n'+pos+'\n%%EOF';
    parts.push(enc(xref));
    return new Blob(parts,{type:'application/pdf'});
  }
  function savePdf(blob){
    var a=document.createElement('a'), url=URL.createObjectURL(blob);
    a.href=url; a.download='ekranpro-podbor-ekrana.pdf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},60000);
  }

  // ——— Человека на схеме можно перетаскивать: меняется расстояние просмотра ———
  var dragP=null;
  el.svg.addEventListener('pointerdown',function(e){
    if(!e.target.closest||!e.target.closest('.pb-person'))return;
    dragP={x:e.clientX,d:st.d,k:Math.max(0.5,sceneGeom.broken?sceneGeom.k:sceneGeom.k/2)}; // схема центрируется, поэтому человек смещается вдвое медленнее расстояния
    el.svg.setPointerCapture(e.pointerId); el.svg.classList.add('is-drag'); touch(); e.preventDefault();
  });
  el.svg.addEventListener('pointermove',function(e){
    if(!dragP)return;
    var L=LIMITS[st.env].d, v=dragP.d+(e.clientX-dragP.x)/dragP.k;
    v=clamp(Math.round(v/L[2])*L[2],L[0],L[1]);
    if(v!==st.d){ st.d=v; st.pick=null; render(); }
  });
  ['pointerup','pointercancel'].forEach(function(t){el.svg.addEventListener(t,function(){dragP=null;el.svg.classList.remove('is-drag')})});

  el.svg.addEventListener('keydown',function(e){
    if(place().nav||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'))return;
    var L=LIMITS[st.env].d, v=clamp(st.d+(e.key==='ArrowRight'?L[2]:-L[2]),L[0],L[1]);
    e.preventDefault(); touch(); if(v!==st.d){ st.d=v; st.pick=null; render(); }
  });

  // ——— Два вида в одном экране: подбор и рекомендации по шагу ———
  var root=$('ep-podbor'), viewCalc=$('pb-view-calc'), viewRec=$('pb-view-rec'), hintTimer;
  function setView(v){
    st.view=v; viewCalc.hidden=v!=='calc'; viewRec.hidden=v!=='rec';
    root.dataset.view=v; $('pb-back').hidden=v!=='rec';
    $('pb-title').textContent=v==='rec'?'Рекомендации по выбору шага пикселя':'Подберите экран под ваш объект';
    if(v==='rec'){ paintTiles(); $('pb-back').focus({preventScroll:true}); } else { drawScene(); }
    if(!root.classList.contains('is-pinned')) root.scrollIntoView({block:'start'});
  }
  $('pb-rec-open').addEventListener('click',function(){
    if(!st.touched){ // экран ещё не выбирали: показываем подсказку вместо рекомендаций
      var h=$('pb-hint'); h.hidden=false; clearTimeout(hintTimer); hintTimer=setTimeout(function(){h.hidden=true},6000); return;
    }
    setView('rec');
  });
  $('pb-back').addEventListener('click',function(){setView('calc')});

  // ——— Закрепление: блок занимает ровно один экран и держится, пока не прокрутят дальше ———
  function pin(){
    var on=window.innerWidth>=1000&&window.innerHeight>=600;
    root.classList.toggle('is-pinned',on);
    root.style.setProperty('--pb-vh',window.innerHeight+'px');
    var hdr=document.querySelector('#ekranpro-first-screen .ep1-header'); // закреплённая шапка сайта перекрывает верх экрана
    root.style.setProperty('--pb-hdr',((hdr&&hdr.offsetHeight)||84)+'px');
    if(on&&st.view==='calc'){ // параметры не помещаются по высоте — оставляем обычную прокрутку
      var cc=root.querySelector('.pb-controls'), cs=getComputedStyle(cc), kids=[].filter.call(cc.children,function(x){return !x.hidden&&x.tagName==='DIV'});
      var need=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+(kids.length-1)*10+kids.reduce(function(a,x){return a+x.offsetHeight},0); // 10 px — минимальный отступ между группами
      if(need+(el.mountBox.hidden&&el.navBox.hidden?64:0)>cc.clientHeight+1) root.classList.remove('is-pinned');
    }
  }
  ['pb-img-screen','pb-img-board'].forEach(function(id){$(id).addEventListener('load',paintTiles)});
  renderPlaces(); renderMount(); render();
  pin(); drawScene(); // закрепляем после первой отрисовки: высота блока уже известна
  var rt; window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){pin();render()},120)});
  if(window.ResizeObserver) new ResizeObserver(function(){drawScene()}).observe(el.svg.parentNode); // схема рисуется в пикселях контейнера
  window.__pb={calc:calc,PLACES:PLACES,money:money,makePdf:makePdf};
})();
