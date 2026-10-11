'use strict';
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const clock=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const fullClock=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'});
const dateFormat=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const todayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
const number=new Intl.NumberFormat('es-ES',{maximumFractionDigits:1,minimumFractionDigits:1});
let features=[],selected=null,point=null,projection=null;
function today() { const p=Object.fromEntries(todayFormat.formatToParts(new Date()).map(v=>[v.type,v.value])); return `${p.year}-${p.month}-${p.day}`; }
function svg(tag,attrs={},parent) { const node=document.createElementNS(NS,tag); for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value)); if(parent)parent.append(node);return node; }
function polygons(feature){return feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;}
function area(ring) {return ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;}
function inside(p,ring) {let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;}
function reference(feature) {
  const poly=polygons(feature).reduce((a,b)=>Math.abs(area(a[0]))>Math.abs(area(b[0]))?a:b),ring=poly[0],a=area(ring);
  let x=0,y=0;for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],w=p[0]*q[1]-q[0]*p[1];x+=(p[0]+q[0])*w;y+=(p[1]+q[1])*w;}
  const p=[x/(6*a),y/(6*a)];
  if(inside(p,ring)&&!poly.slice(1).some(h=>inside(p,h)))return p;
  // Un punto interior derivado de la geometría, evitando agujeros y el mar.
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  for(let row=1;row<50;row++)for(let col=1;col<50;col++){const q=[minX+(maxX-minX)*col/50,minY+(maxY-minY)*row/50];if(inside(q,ring)&&!poly.slice(1).some(h=>inside(q,h)))return q;}
  throw Error(`No se pudo localizar un punto interior de ${feature.properties.NOM}.`);
}
function makeMap() {
  const coords=features.flatMap(f=>polygons(f).flatMap(p=>p.flat()));
  const minX=Math.min(...coords.map(p=>p[0])),maxX=Math.max(...coords.map(p=>p[0])),minY=Math.min(...coords.map(p=>p[1])),maxY=Math.max(...coords.map(p=>p[1]));
  const cos=Math.cos(39.6*Math.PI/180),scale=Math.min(640/((maxX-minX)*cos),480/(maxY-minY));
  const xOffset=(720-(maxX-minX)*cos*scale)/2,yOffset=(560-(maxY-minY)*scale)/2;
  projection={forward:p=>[xOffset+(p[0]-minX)*cos*scale,yOffset+(maxY-p[1])*scale],inverse:p=>[minX+(p[0]-xOffset)/(cos*scale),maxY-(p[1]-yOffset)/scale]};
  $('regions').replaceChildren();$('municipality').replaceChildren();
  for(const feature of features) {
    const {ID,NOM}=feature.properties;
    const option=document.createElement('option');option.value=ID;option.textContent=NOM;$('municipality').append(option);
    const d=polygons(feature).flatMap(p=>p.map(ring=>ring.map((point,i)=>`${i?'L':'M'}${projection.forward(point).map(n=>n.toFixed(2)).join(',')}`).join(' ')+'Z')).join(' ');
    const path=svg('path',{d,'fill-rule':'evenodd',class:'municipality',tabindex:'0',role:'button','aria-label':`Calcular la Luna en ${NOM}`,'aria-pressed':'false','data-id':ID},$('regions'));
    const title=svg('title',{},path);title.textContent=NOM;
    path.addEventListener('click',event=>{
      if(event.detail===0){select(feature);return;}
      const screen=$('map').createSVGPoint();screen.x=event.clientX;screen.y=event.clientY;
      const local=screen.matrixTransform($('map').getScreenCTM().inverse());select(feature,projection.inverse([local.x,local.y]));
    });
    path.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(feature);}});
  }
  $('municipality').disabled=false;
}
function select(feature,coordinates) {
  selected=feature;point=coordinates||reference(feature);$('municipality').value=feature.properties.ID;
  document.querySelectorAll('.municipality').forEach(path=>{const active=path.dataset.id===feature.properties.ID;path.classList.toggle('active',active);path.setAttribute('aria-pressed',String(active));});
  const [x,y]=projection.forward(point);$('pin').setAttribute('transform',`translate(${x},${y})`);
  $('map-name').textContent=feature.properties.NOM;$('coordinates').textContent=`${point[1].toFixed(4)}° N · ${point[0].toFixed(4)}° E`;
  update();
}
function drawMoon(result) {
  const canvas=$('moon'),ctx=canvas.getContext('2d'),w=canvas.width,r=w*.43,c=w/2,image=ctx.createImageData(w,w);
  const sunZ=2*result.fraction-1,sunX=Math.sqrt(Math.max(0,1-sunZ*sunZ))*(result.angle<180?1:-1);
  for(let y=0;y<w;y++)for(let x=0;x<w;x++){
    const nx=(x-c)/r,ny=(y-c)/r,r2=nx*nx+ny*ny;if(r2>1)continue;
    const z=Math.sqrt(1-r2),light=nx*sunX+z*sunZ;
    const texture=1+.035*Math.sin(nx*47+ny*18)*Math.cos(ny*32-nx*10);
    const shade=light>0?(125+110*Math.sqrt(light))*texture:29+9*z;
    const i=(y*w+x)*4;image.data[i]=shade;image.data[i+1]=shade*.99;image.data[i+2]=shade*.92;image.data[i+3]=Math.min(255,(1-Math.sqrt(r2))*r*255);
  }
  ctx.clearRect(0,0,w,w);ctx.putImageData(image,0,0);canvas.setAttribute('aria-label',`${result.name}: ${number.format(result.fraction*100)} % del disco iluminado, esquema con el norte arriba.`);
}
function drawChart(result) {
  const root=$('chart');root.replaceChildren();const W=1000,H=320,p={l:58,r:25,t:22,b:45},span=result.end-result.start;
  const x=time=>p.l+(time-result.start)/span*(W-p.l-p.r),y=alt=>p.t+(90-alt)/180*(H-p.t-p.b);
  const title=svg('title',{},root);title.textContent=`Altura lunar en ${selected.properties.NOM}: ${dateFormat.format(result.noon)}`;
  const description=svg('desc',{},root);description.textContent=`Máximo ${number.format(result.maximum.altitude)} grados a las ${fullClock.format(result.maximum.time)}. Eje horizontal: hora local. Eje vertical: altura en grados.`;
  svg('rect',{x:p.l,y:y(90),width:W-p.l-p.r,height:y(0)-y(90),fill:'#e2eeea'},root);
  for(const alt of [-90,-45,0,45,90]){
    svg('line',{x1:p.l,x2:W-p.r,y1:y(alt),y2:y(alt),stroke:alt===0?'#4a6869':'#d1dbd4','stroke-dasharray':alt===0?'':'3 5'},root);
    const text=svg('text',{x:p.l-12,y:y(alt)+5,'text-anchor':'end',fill:'#61757a','font-size':13},root);text.textContent=`${alt}°`;
  }
  for(let hours=0;hours<span/3600000;hours+=3){const time=new Date(+result.start+hours*3600000),xp=x(time);svg('line',{x1:xp,x2:xp,y1:p.t,y2:H-p.b,stroke:'#d1dbd4','stroke-dasharray':'3 5'},root);const text=svg('text',{x:xp,y:H-17,'text-anchor':'middle',fill:'#61757a','font-size':13},root);text.textContent=clock.format(time);}
  const endLabel=svg('text',{x:W-p.r,y:H-17,'text-anchor':'middle',fill:'#61757a','font-size':13},root);endLabel.textContent='24:00';
  const d=result.samples.map((s,i)=>`${i?'L':'M'}${x(s.time).toFixed(2)},${y(s.altitude).toFixed(2)}`).join(' ');
  const defs=svg('defs',{},root);
  for(const [id,top,bottom,color] of [['altitude-above',y(90),y(0),'#23595c'],['altitude-below',y(0),y(-90),'#9daca7']]){
    const clip=svg('clipPath',{id},defs);svg('rect',{x:p.l-2,y:top,width:W-p.l-p.r+4,height:bottom-top},clip);
    svg('path',{d,fill:'none',stroke:color,'stroke-width':3,'stroke-linejoin':'round','clip-path':`url(#${id})`},root);
  }
  svg('circle',{cx:x(result.maximum.time),cy:y(result.maximum.altitude),r:6,fill:'#c2822e',stroke:'#f1f0e8','stroke-width':2},root);
  $('chart-description').textContent=`Día de ${span/3600000} horas locales. Máximo: ${number.format(result.maximum.altitude)}° a las ${fullClock.format(result.maximum.time)}. Las alturas negativas sitúan el centro de la Luna bajo el horizonte. La salida y la puesta usan el borde del disco, por lo que no coinciden exactamente con el cruce de la curva por 0°.`;
}
function update() {
  if(!selected)return;
  try {
    if(!$('date').checkValidity())throw Error('Elige una fecha válida entre 1900 y 2100.');
    const result=Lunar.calculate($('date').value,point[1],point[0]);
    $('phase-name').textContent=result.name;$('illumination').textContent=`${number.format(result.fraction*100)} %`;
    $('result-date').textContent=`${selected.properties.NOM} · ${dateFormat.format(result.noon)}`;
    for(const [id,events,label] of [['rise',result.rises,'salida'],['set',result.sets,'puesta']]){
      $(id).textContent=events.length?events.map(date=>{const rounded=new Date(Math.round(+date/60000)*60000);return rounded>=result.end?'24:00':clock.format(rounded);}).join(' / '):`Sin ${label} este día`;
      $(id).classList.toggle('absent',events.length===0);
    }
    $('maximum').textContent=`${number.format(result.maximum.altitude)}°`;
    const boundary=+result.maximum.time-+result.start<1000||+result.end-+result.maximum.time<1000;
    $('maximum-time').textContent=`A las ${fullClock.format(result.maximum.time)}${boundary?' · máximo en el límite del día':''}`;
    $('zone').textContent=`Horas locales de Mallorca · Europe/Madrid · ${fullClock.format(result.noon).split(' ').slice(1).join(' ')} al mediodía`;
    drawMoon(result);drawChart(result);$('error').hidden=true;$('app').hidden=false;$('chart-section').hidden=false;
    $('previous').disabled=$('date').value==='1900-01-01';$('next').disabled=$('date').value==='2100-12-31';
  } catch(error) {showError(error.message);$('chart-section').hidden=true;$('app').hidden=true;}
}
function showError(message){$('error').textContent=message;$('error').hidden=false;}
function shiftDay(amount){if(!$('date').checkValidity()){update();return;}const date=new Date(`${$('date').value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+amount);$('date').value=date.toISOString().slice(0,10);update();}
$('date').value=today();$('date').addEventListener('change',update);
$('controls').addEventListener('submit',event=>{event.preventDefault();update();});
$('municipality').addEventListener('change',()=>select(features.find(f=>f.properties.ID===$('municipality').value)));
$('previous').addEventListener('click',()=>shiftDay(-1));$('next').addEventListener('click',()=>shiftDay(1));$('today').addEventListener('click',()=>{$('date').value=today();update();});
(async function init(){
  try{
    if(typeof Astronomy==='undefined'||typeof Lunar==='undefined')throw Error('No se pudo cargar el cálculo astronómico. Recarga la página.');
    const response=await fetch('municipios.geojson');if(!response.ok)throw Error('No se pudo abrir el mapa. Recarga la página para volver a intentarlo.');
    const data=await response.json();features=data.features.sort((a,b)=>a.properties.NOM.localeCompare(b.properties.NOM,'ca'));
    if(features.length!==53)throw Error('El mapa de municipios está incompleto.');
    makeMap();select(features.find(f=>f.properties.NOM==='Palma')||features[0]);
  }catch(error){showError(error.message);}finally{$('loading').hidden=true;}
})();
