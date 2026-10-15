/* Логика «Конструктора щита» — этап 1 рефакторинга.
   Прайс CAT загружается из catalog.js (подключается ПЕРЕД этим файлом). */
'use strict';
// если catalog.js не загрузился — приложение работает без прайса, не падая
var CAT = (typeof CAT !== 'undefined' && CAT && CAT.length) ? CAT : [];

function fixMeters(C){
  C.forEach(function(c){
    if(c.type!=='mtr')return;
    var n=c.name||'';
    if(/испытательная/i.test(n)){c.rack=false;c.width=0;return}
    if(/болт/i.test(n)&&!/рейка/i.test(n)){c.rack=false;c.width=0;return}
    if(/231/.test(n))c.width=8;
    else if(/230/.test(n))c.width=10;
    else if(/СЕ303|CE303/i.test(n))c.width=8;
    else if(/ЦЭ680|ЦЭ685/i.test(n))c.width=6;
    else if(/NP73/i.test(n))c.width=5;
    else if(/201\.[78]/.test(n))c.width=4;
    else if(/Меркурий 20\d/.test(n))c.width=6;
    else c.width=5;
    c.rack=true;
  });
}
fixMeters(CAT);

var TYPEN={avt:'Автомат',uzo:'УЗО',avdt:'Дифавтомат',mtr:'Счётчик',rub:'Рубильник',km:'Контактор',rel:'Реле напряжения',usip:'УЗИП',kor:'Корпус щита',shina:'Шина',klem:'Клемма'};
var BRANDCOL={'EKF':'#1d5da8','IEK':'#c8102e','TDM':'#e67e22','Schneider Electric':'#3d9b35','DeKraft':'#8e44ad','Энергомера':'#1d5da8','Меркурий':'#c0392b','НЕВА':'#2c3e50','Топаз':'#d35400','Матрица':'#16a085','Welrok':'#2b6cb0'};
var S={rackLen:18,rackCount:1,korpus:null,mods:[],wires:[],kpos:{},labels:[]};
function save(){try{localStorage.setItem('shieldV3',JSON.stringify(S))}catch(e){}}
function load(){try{var d=JSON.parse(localStorage.getItem('shieldV3'));if(d)S=Object.assign(S,d)}catch(e){}}
function modCount(){return S.mods.reduce(function(a,m){return a+(m.w||1)},0)}
function rackCapacity(){return S.rackLen*S.rackCount}
var $=function(id){return document.getElementById(id)};

/* ---------- Каталог ---------- */
var shown=0,STEP=100,curList=[];
function fillBrands(){var b={};CAT.forEach(function(c){if(c.brand)b[c.brand]=1});var sel=$('fBrand');Object.keys(b).sort().forEach(function(k){var o=document.createElement('option');o.value=o.textContent=k;sel.appendChild(o)})}
function applyFilters(){
  var br=$('fBrand').value,tp=$('fType').value,q=$('fSearch').value.toLowerCase();
  curList=CAT.filter(function(c){if(br&&c.brand!=br)return false;if(tp&&c.type!=tp)return false;
    if(q&&!(c.name.toLowerCase().indexOf(q)>=0||c.code.toLowerCase().indexOf(q)>=0))return false;return true});
  shown=0;$('catGrid').innerHTML='';renderMore();
}
function card(c){
  var d=document.createElement('div');d.className='catcard';
  var mini=miniDev(c);
  var info=document.createElement('div');info.className='info';
  info.innerHTML='<div class="nm">'+c.name+'</div><div class="pr">'+c.price.toFixed(2)+' ₽/'+(c.unit||'шт')+'</div><div class="ar">'+TYPEN[c.type]+' · код '+c.code+(c.brand?' · '+c.brand:'')+'</div>';
  d.appendChild(mini);d.appendChild(info);
  d.onclick=function(){addFromCat(c)};
  return d;
}
function miniDev(c){
  var w=Math.max(c.width||1,1)*38;
  var d=document.createElement('div');d.style.cssText='width:'+w+'px;height:60px;position:relative;flex-shrink:0';
  var b=document.createElement('div');b.className='body';b.style.cssText='position:absolute;inset:0;border:1px solid #7c8794;border-radius:4px;background:#f4f6f8;overflow:hidden';
  var st=document.createElement('div');st.className='stripe';st.style.background=BRANDCOL[c.brand]||'#5a6472';st.textContent=(c.brand||'').slice(0,10);
  b.appendChild(st);
  var t=document.createElement('div');t.style.cssText='position:absolute;top:14px;left:0;right:0;text-align:center;font-size:7px;color:#5a6472;white-space:nowrap;overflow:hidden';t.textContent=c.type=='kor'?'':(c.name.slice(0,22));
  b.appendChild(t);
  if(c.type=='avt'||c.type=='avdt'||c.type=='uzo'||c.type=='rub'||c.type=='km'){
    var lv=document.createElement('div');lv.className='lever';lv.style.top='45%';lv.style.height='22%';b.appendChild(lv);
  }
  if(c.type=='avdt'){var tb=document.createElement('div');tb.className='tbtn';tb.style.cssText+=';top:24%;background:#c0392b';tb.textContent='T';b.appendChild(tb)}
  if(c.type=='uzo'){var tb=document.createElement('div');tb.className='tbtn';tb.style.cssText+=';top:24%;background:#2980b9';tb.textContent='T';b.appendChild(tb)}
  if(c.type=='mtr'){var ds=document.createElement('div');ds.className='disp';ds.style.top='30%';ds.style.height='30%';ds.textContent='12345';b.appendChild(ds)}
  if(c.amp){var a=document.createElement('div');a.style.cssText='position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:11px;font-weight:800';a.textContent=c.amp+'A';b.appendChild(a)}
  d.appendChild(b);
  return d;
}
function renderMore(){
  var g=$('catGrid'),end=Math.min(shown+STEP,curList.length);
  for(var i=shown;i<end;i++)g.appendChild(card(curList[i]));
  shown=end;
  $('moreBtn').style.display=end<curList.length?'block':'none';
}
function addFromCat(c){
  if(c.type=='kor'){
    var m=c.name.match(/(\d{1,2})\s*(?:модул|мест)/i);
    var n=m?parseInt(m[1]):18;
    S.korpus={code:c.code,name:c.name,price:c.price,mods:n};
    S.rackLen=Math.max(n,12);S.rackCount=1;S.mods=[];
    $('rackLen').value=String(S.rackLen);$('rackCount').value='1';
    toast('Корпус добавлен: '+c.name+' ('+n+' модулей)');
    drawMont();save();return;
  }
  if(c.rack===false){toast('Этот прибор не модульный — крепится на болты, на план не ставится');return}
  var aw=(c.type=='shina'?0:Math.max(c.width||1,1));
  if(modCount()+aw>rackCapacity()){toast('Не хватает места на рейке');return}
  S.mods.push({code:c.code,name:c.name,price:c.price,unit:c.unit,brand:c.brand,type:c.type,poles:c.poles||1,amp:c.amp||0,w:aw,lane:curLane(),lbl:''});
  drawMont();save();toast('Добавлено: '+shortName(c.name));
}
function curLane(){var lanes={};S.mods.forEach(function(m){lanes[m.lane]=(lanes[m.lane]||0)+m.w});var i=0;while(lanes[i]&&lanes[i]>=S.rackLen)i++;return i}
function shortName(n){return n.length>40?n.slice(0,40)+'…':n}
function toast(t){var e=document.createElement('div');e.style.cssText='position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#2d3748;color:#fff;padding:8px 14px;border-radius:8px;z-index:999;font-size:13px';e.textContent=t;document.body.appendChild(e);setTimeout(function(){e.remove()},1800)}

/* ---------- План монтажа ---------- */
var MW=38,MH=150;
function drawMont(){
  var wrap=$('rackwrap');wrap.innerHTML='';
  var k=$('korpusWrap');
  if(S.korpus){
    if(!k.firstChild){
      var kd=document.createElement('div');kd.className='korpus';kd.innerHTML='<div class="kname">'+S.korpus.name+'</div><div class="kscrew" style="top:4px;right:8px"></div><div class="kscrew" style="top:4px;left:8px"></div><div class="kscrew" style="bottom:4px;right:8px"></div><div class="kscrew" style="bottom:4px;left:8px"></div><div id="korpusInner"></div>';
      k.appendChild(kd);
    }
  } else k.innerHTML='';
  var host=S.korpus?$('korpusInner'):wrap;
  host.innerHTML='';
  var cap=S.rackLen;
  var totalW=cap*MW;
  for(var lane=0;lane<S.rackCount;lane++){
    var rd=document.createElement('div');rd.className='rack';rd.style.minHeight=(MH+20)+'px';
    rd.style.maxWidth=Math.max(totalW,120)+'px';rd.style.width='100%';
    // рейка как подложка
    var bar=document.createElement('div');bar.className='rackbar';bar.style.top=(MH-12)+'px';bar.style.left='0';bar.style.width=(totalW)+'px';
    rd.appendChild(bar);
    // отверстия рейки
    for(var x=0;x<cap;x++){var h=document.createElement('div');h.style.cssText='position:absolute;top:'+(MH-9)+'px;width:6px;height:6px;border-radius:50%;background:#8d97a2';h.style.left=(x*MW+MW/2-3)+'px';rd.appendChild(h)}
    // модули этой рейки
    var mods=S.mods.filter(function(m){return m.lane==lane});
    var cx=0;
    mods.forEach(function(m,i){
      drawDev(rd,m,cx,i);cx+=m.w;
    });
    // свободные места
    for(var sx=cx;sx<cap;sx++){
      var sl=document.createElement('div');sl.className='slot';sl.style.left=(sx*MW)+'px';sl.style.width=(MW-4)+'px';
      sl.innerHTML='<div class="h">'+(sx+1)+'</div>';rd.appendChild(sl);
    }
    // гребёнчатая шина — сверху, зубья вниз к вводам автоматов
    var hasBus=S.mods.some(function(x){return x.type=='shina'&&x.lane==lane});
    if(hasBus){
      var bl=document.createElement('div');bl.className='comb';bl.style.left='0';bl.style.top='8px';bl.style.width=totalW+'px';
      rd.appendChild(bl);
      var lb2=document.createElement('div');lb2.className='comblab';lb2.textContent='Гребёнчатая шина · подключение сверху';lb2.style.left=(totalW+8)+'px';
      rd.appendChild(lb2);
      mods.forEach(function(m){
        if(m.type=='shina')return;
        var cx0=(m._x!==undefined?m._x:posOf(m));
        var th=document.createElement('div');th.className='tooth';
        th.style.left=(cx0+(m.w*MW)/2-3)+'px';th.style.top='18px';
        rd.appendChild(th);
      });
    }
    host.appendChild(rd);
  }
  var used=modCount(),cap2=rackCapacity();
  $('montStat').textContent='Модулей: '+used+' / '+cap2+(S.korpus?' · корпус: '+shortName(S.korpus.name):' · без корпуса');
  $('montWarn').textContent=used>cap2?'⚠ Модулей больше, чем мест на рейке':'';
  save();
}
function drawDev(rd,m,idx){
  var d=document.createElement('div');d.className='dev';d.dataset.i=idx;
  d.style.left=(m._x!==undefined?m._x:posOf(m))+'px';
  d.style.width=(m.w*MW-4)+'px';d.style.height=MH+'px';
  var b=document.createElement('div');b.className='body';
  var st=document.createElement('div');st.className='stripe';st.style.background=BRANDCOL[m.brand]||'#5a6472';st.textContent=(m.brand||'').slice(0,12);b.appendChild(st);
  var se=document.createElement('div');se.className='series';se.textContent=series(m.name);b.appendChild(se);
  if(m.type=='mtr'){
    var ds=document.createElement('div');ds.className='disp';ds.textContent=Math.round(Math.random()*9)+''+Math.round(Math.random()*9)+'.'+Math.round(Math.random()*9)+' '+Math.round(Math.random()*9);b.appendChild(ds);
    var cl=document.createElement('div');cl.style.cssText='position:absolute;bottom:2px;left:4px;right:4px;height:14px;display:flex;gap:2px';for(var j=0;j<4;j++){var cc=document.createElement('div');cc.style.cssText='flex:1;background:#e8ebee;border:1px solid #9aa4b0;border-radius:1px';cl.appendChild(cc)}b.appendChild(cl);
  } else if(m.type=='rel'){
    var ds=document.createElement('div');ds.className='disp';ds.textContent='242';b.appendChild(ds);
    var bb=document.createElement('div');bb.style.cssText='position:absolute;bottom:14px;left:20%;width:60%;height:14%;display:flex;gap:3px';for(var j=0;j<2;j++){var x2=document.createElement('div');x2.style.cssText='flex:1;background:#3d4654;border-radius:2px';bb.appendChild(x2)}b.appendChild(bb);
  } else if(m.type=='kor'){
    var big=document.createElement('div');big.className='big';big.innerHTML='<div style="font-size:10px;color:#4a5568">КОРПУС</div><div style="font-size:8px;color:#8a94a2;margin-top:2px">'+shortName(m.name)+'</div>';b.appendChild(big);
  } else if(m.type=='shina'){
    return;
  } else if(m.type=='klem'){
  } else if(m.type=='klem'){
    var big=document.createElement('div');big.className='big';big.innerHTML='<div style="font-size:9px;color:#4a5568">КЛЕММА</div>';b.appendChild(big);
  } else {
    if(m.type=='uzo'||m.type=='avdt'){
      var tb=document.createElement('div');tb.className='tbtn';tb.style.top='22%';tb.style.background=m.type=='uzo'?'#2980b9':'#c0392b';tb.textContent='T';b.appendChild(tb);
      var te=document.createElement('div');te.style.cssText='position:absolute;top:40%;left:0;right:0;text-align:center;font-size:8px;color:#5a6472';te.textContent=(m.type=='uzo'?'30мА':'30мА/C');b.appendChild(te);
    }
    var lv=document.createElement('div');lv.className='lever';lv.style.top='52%';lv.style.height='26%';lv.classList.add('on');b.appendChild(lv);
    var io=document.createElement('div');io.style.cssText='position:absolute;top:47%;right:2px;font-size:7px;color:#8a94a2';io.textContent='I';b.appendChild(io);
  }
  if(m.amp&&m.type!='mtr'){var a=document.createElement('div');a.className='amp';a.textContent=m.amp+'A';b.appendChild(a)}
  for(var j=0;j<2;j++){var sc=document.createElement('div');sc.className='screw';sc.style.top=(2+j*(MH-18))+'px';sc.style.left='8px';b.appendChild(sc);
    var sc2=document.createElement('div');sc2.className='screw';sc2.style.top=(2+j*(MH-18))+'px';sc2.style.right='8px';b.appendChild(sc2);}
  var hn=document.createElement('div');hn.className='hnd';b.appendChild(hn);
  d.appendChild(b);
  if(m.lbl){var tg=document.createElement('div');tg.className='tag';tg.textContent=m.lbl;d.appendChild(tg)}
  var lb=document.createElement('div');lb.className='lbl';lb.textContent=shortName(m.name);d.appendChild(lb);
  var P=polesOf(m);
  [1,0].forEach(function(isTop){
    var side=isTop?'t':'b';
    termLabels(m,P,side).forEach(function(lab,j){
      var pt=document.createElement('div');pt.className='ptr '+(isTop?'top':'bot');
      pt.style.left=((j+0.5)/P*100)+'%';pt.textContent=lab;
      d.appendChild(pt);
    });
  });
  d.onclick=function(e){if(e.target.classList.contains('ptr'))return;
    if(d.classList.contains('sel')){if(confirm('Удалить «'+shortName(m.name)+'»?')){S.mods=S.mods.filter(function(x){return x!==m});d.classList.remove('sel');drawMont()}}
    else{document.querySelectorAll('.dev.sel').forEach(function(x){x.classList.remove('sel')});d.classList.add('sel')}
  };
  dragDev(d,m);
  rd.appendChild(d);
}
function posOf(m){var x=0;for(var i=0;i<S.mods.length;i++){if(S.mods[i]===m)break;if(S.mods[i].lane==m.lane)x+=S.mods[i].w}return x*MW}
function series(n){var m=n.match(/(ВА[\dА-Я\-]+|AVERES|PROxima|Acti9|iC60|ВД1|АВДТ|ВДТ|КМ|РН-)/);return m?m[1]:''}
var drag=null;
function dragDev(d,m){
  d.addEventListener('pointerdown',function(e){if(e.target.classList.contains('ptr'))return;drag={el:d,m:m,sx:e.clientX,sy:e.clientY,moved:false};d.setPointerCapture(e.pointerId)});
  d.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
    if(Math.abs(dx)+Math.abs(dy)>8)drag.moved=true;
    if(drag.moved){d.style.left=(parseFloat(d.style.left)+ (e.movementX||0))+'px';d._dx=(d._dx||0)+(e.movementX||0)}});
  d.addEventListener('pointerup',function(e){if(drag&&drag.moved){var slots=Math.round((parseFloat(d.style.left))/MW);var lane=Math.max(0,Math.min(S.rackCount-1,m.lane));
    if(slots<0)slots=0;var fits=fitAt(m,lane,slots);if(fits!=null){m.lane=fits.lane;var arr=S.mods.filter(function(x){return x.lane==fits.lane&&x!==m});arr.push(m);arr.sort(function(a,b){return (a._ord||0)-(b._ord||0)});S.mods=S.mods.filter(function(x){return x.lane!=fits.lane||x===m});arr.forEach(function(x,i){x._ord=i});S.mods=S.mods.concat(arr.filter(function(x){return S.mods.indexOf(x)<0}))}else toast('Нет места');}
    delete m._x;drag=null;drawMont()});
}
function fitAt(m,lane,slots){var ms=S.mods.filter(function(x){return x.lane==lane&&x!==m});var free=[],occ={};ms.forEach(function(x){for(var i=0;i<x.w;i++)occ[i]=1});var run=0;
  for(var i=0;i<S.rackLen;i++){if(!occ[i]){run++;if(run>=m.w)return{lane:lane}}else run=0}
  for(var l=0;l<S.rackCount;l++){if(l==lane)continue;var o2={};S.mods.filter(function(x){return x.lane==l&&x!==m}).forEach(function(x){for(var i=0;i<x.w;i++)o2[i]=1});var r=0;for(var i=0;i<S.rackLen;i++){if(!o2[i]){r++;if(r>=m.w)return{lane:l}}else r=0}}
  return null;
}
$('rackLen').onchange=function(){S.rackLen=parseInt(this.value)||18;S.korpus=null;$('korpusWrap').innerHTML='';drawMont()};
$('rackCount').onchange=function(){S.rackCount=parseInt(this.value)||1;drawMont()};
$('clearMont').onclick=function(){if(confirm('Очистить монтаж?')){S.mods=[];S.korpus=null;$('korpusWrap').innerHTML='';drawMont()}};
$('fBrand').onchange=applyFilters;$('fType').onchange=applyFilters;$('fSearch').oninput=applyFilters;$('moreBtn').onclick=renderMore;
