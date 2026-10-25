'use strict';
const $=id=>document.getElementById(id),M=Interferometry;
const fields=['frequency','duration','declination','noise','separation'];
const fmt=(n,d=1)=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
let antennas=M.layout('y',6),layoutName='y',active=0,drag=null,generation=0,busy=false,queued=null,last=null,worker=null;
function params(){return {antennas:antennas.map(a=>({...a})),frequency:+$('frequency').value,duration:+$('duration').value,declination:+$('declination').value,noise:+$('noise').value,separation:+$('separation').value,scene:$('scene').value};}
function positionFields(){
  $('antenna').replaceChildren();antennas.forEach((a,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`A${i+1}`;$('antenna').append(option);});
  $('antenna').value=active;$('east').value=antennas[active].x.toFixed(1);$('north').value=antennas[active].y.toFixed(1);
}
function outputs(){
  $('frequency-value').textContent=`${fmt(+$('frequency').value)} GHz`;$('duration-value').textContent=`${fmt(+$('duration').value)} h`;
  $('declination-value').textContent=`${$('declination').value}°`;$('noise-value').textContent=fmt(+$('noise').value,2);$('separation-value').textContent=`${$('separation').value}″`;
  $('separation-control').hidden=$('scene').value!=='binary';
  document.querySelectorAll('[data-layout]').forEach(b=>{const on=b.dataset.layout===layoutName;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
}
function arrayXY(a){return {x:340+a.x*1.45,y:285-a.y*1.45};}
function drawArray(){
  const canvas=$('array'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#102a31';ctx.fillRect(0,0,w,h);ctx.lineWidth=1;ctx.strokeStyle='#29444a';ctx.font='12px monospace';ctx.fillStyle='#8dada8';
  for(let p=-150;p<=150;p+=50){const a=arrayXY({x:p,y:0}),b=arrayXY({x:0,y:p});ctx.beginPath();ctx.moveTo(a.x,20);ctx.lineTo(a.x,h-30);ctx.moveTo(45,b.y);ctx.lineTo(w-25,b.y);ctx.stroke();ctx.fillText(String(p),a.x+3,h-13);if(p)ctx.fillText(String(p),8,b.y+4);}
  ctx.strokeStyle='#58857c66';for(let i=0;i<antennas.length;i++)for(let j=i+1;j<antennas.length;j++){const a=arrayXY(antennas[i]),b=arrayXY(antennas[j]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  antennas.forEach((a,i)=>{const p=arrayXY(a);if(i===active){ctx.beginPath();ctx.arc(p.x,p.y,16,0,2*Math.PI);ctx.strokeStyle='#edb85f';ctx.stroke();}ctx.beginPath();ctx.arc(p.x,p.y,7,0,2*Math.PI);ctx.fillStyle=i===active?'#edb85f':'#64ccd0';ctx.fill();ctx.fillStyle='#e5eee5';ctx.fillText(`A${i+1}`,p.x+13,p.y-9);});
  ctx.fillStyle='#a6c4ba';ctx.fillText('N ↑',w-55,25);ctx.fillText('E →',w-60,h-13);
}
function color(value){
  const t=Math.pow(Math.min(1,Math.abs(value)),.6);
  if(value<0)return [7+40*t,23+125*t,28+155*t];
  return [7+237*t,23+165*t,28+67*t];
}
function drawMap(id,data,size,beam=false){
  const canvas=$(id),ctx=canvas.getContext('2d'),small=document.createElement('canvas');small.width=small.height=size;
  const sctx=small.getContext('2d'),pixels=sctx.createImageData(size,size),peak=Math.max(...data.map(Math.abs))||1;
  for(let i=0;i<data.length;i++){const rgb=color(data[i]/peak);pixels.data[i*4]=rgb[0];pixels.data[i*4+1]=rgb[1];pixels.data[i*4+2]=rgb[2];pixels.data[i*4+3]=255;}
  sctx.putImageData(pixels,0,0);ctx.fillStyle='#07171c';ctx.fillRect(0,0,canvas.width,canvas.height);
  const edge=Math.min(canvas.width-40,canvas.height-45);ctx.imageSmoothingEnabled=true;ctx.drawImage(small,24,16,edge,edge);
  ctx.fillStyle='#b7c9bf';ctx.font='11px monospace';ctx.fillText('−60″',24,canvas.height-12);ctx.textAlign='right';ctx.fillText('+60″',canvas.width-16,canvas.height-12);ctx.textAlign='left';
  canvas.setAttribute('aria-label',`${id==='sky'?'Modelo de cielo':beam?'Haz sucio de una fuente puntual':'Imagen sucia'}, campo de 120 segundos de arco por lado. Colores normalizados a su propio máximo.`);
}
function drawUV(data){
  const canvas=$('uv'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,center=w/2,max=Math.max(1000,...data.samples.map(s=>Math.max(Math.abs(s.u),Math.abs(s.v))))*1.08,scale=(w/2-30)/max;
  ctx.fillStyle='#07171c';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#254148';ctx.lineWidth=1;
  for(const p of [-.75,-.5,-.25,0,.25,.5,.75]){ctx.beginPath();ctx.moveTo(center+p*(w-60)/2,20);ctx.lineTo(center+p*(w-60)/2,h-25);ctx.moveTo(25,center+p*(h-60)/2);ctx.lineTo(w-20,center+p*(h-60)/2);ctx.stroke();}
  ctx.fillStyle='#64ccd0';for(const s of data.samples){ctx.beginPath();ctx.arc(center+s.u*scale,center-s.v*scale,1.6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(center-s.u*scale,center+s.v*scale,1.6,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#b7c9bf';ctx.font='11px monospace';ctx.fillText(`±${fmt(max/1000)} kλ`,20,h-12);ctx.fillText('v ↑',w-45,22);ctx.fillText('u →',w-45,h-12);
}
function actionAvailability(disabled){for(const id of ['csv','png'])$(id).disabled=disabled;}
function receive(message,snapshot){
  busy=false;
  if(message.id===generation){
    if(message.error){$('error').textContent=message.error;$('error').hidden=false;$('status').textContent='No se pudo actualizar la observación. Revisa los parámetros.';actionAvailability(true);}
    else{
      const r=message.result;last={result:r,params:snapshot};$('error').hidden=true;
      drawMap('sky',r.sky,r.size);drawUV(r);drawMap('dirty',r.image,r.size);drawMap('beam',r.beam,r.size,true);
      $('baselines').textContent=String(antennas.length*(antennas.length-1)/2);$('wavelength').textContent=`${fmt(r.wavelength*100)} cm`;$('baseline').textContent=`${fmt(r.maxBaseline,0)} m`;$('resolution').textContent=`${fmt(r.resolution)}″`;
      $('status').textContent=`Observación calculada · ${r.samples.length.toLocaleString('es-ES')} medidas complejas · pesos iguales · ruido reproducible.`;
      $('sampling-note').textContent=`${r.samples.length*2} puntos (u, v), contando conjugados. ${r.hours.length} instantes sobre el horizonte. La escala del gráfico uv se ajusta a cada configuración.`;
      actionAvailability(false);
    }
  }
  flush();
}
function flush(){
  if(busy||!queued)return;
  const job=queued;queued=null;busy=true;
  if(worker){worker.currentSnapshot=job.params;worker.postMessage(job);}
  else setTimeout(()=>{try{receive({id:job.id,result:M.simulate(job.params)},job.params);}catch(error){receive({id:job.id,error:error.message},job.params);}},0);
}
function schedule(){outputs();drawArray();actionAvailability(true);$('status').textContent='Actualizando la observación…';queued={id:++generation,params:params()};flush();}
try{
  worker=new Worker('worker.js');worker.onmessage=event=>receive(event.data,worker.currentSnapshot);
  worker.onerror=event=>{event.preventDefault();worker.terminate();worker=null;busy=false;queued={id:generation,params:params()};flush();};
}catch{worker=null;}
function applyPosition(index,x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>180||Math.abs(y)>180)throw Error('Las posiciones deben estar entre −180 y 180 metros.');
  if(antennas.some((a,i)=>i!==index&&Math.hypot(a.x-x,a.y-y)<5))throw Error('Separa las antenas al menos 5 metros.');
  antennas[index]={x,y};active=index;layoutName='custom';positionFields();schedule();
}
function pointerCoordinates(event){const box=$('array').getBoundingClientRect();return {x:(event.clientX-box.left)/box.width*680,y:(event.clientY-box.top)/box.height*570};}
$('array').addEventListener('pointerdown',event=>{const p=pointerCoordinates(event);let nearest=-1,distance=25;antennas.forEach((a,i)=>{const q=arrayXY(a),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<distance){distance=d;nearest=i;}});if(nearest<0)return;active=nearest;drag=nearest;$('array').setPointerCapture(event.pointerId);positionFields();drawArray();});
$('array').addEventListener('pointermove',event=>{if(drag===null)return;const p=pointerCoordinates(event),x=Math.max(-180,Math.min(180,(p.x-340)/1.45)),y=Math.max(-180,Math.min(180,(285-p.y)/1.45));try{applyPosition(drag,x,y);}catch{}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('array').addEventListener(type,()=>drag=null);
$('position-form').addEventListener('submit',event=>{event.preventDefault();try{applyPosition(+$('antenna').value,$('east').valueAsNumber,$('north').valueAsNumber);}catch(error){$('error').textContent=error.message;$('error').hidden=false;}});
$('antenna').addEventListener('change',()=>{active=+$('antenna').value;positionFields();drawArray();});
document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>{layoutName=button.dataset.layout;antennas=M.layout(layoutName,+$('count').value);active=0;positionFields();schedule();}));
$('count').addEventListener('change',()=>{layoutName=layoutName==='custom'?'y':layoutName;antennas=M.layout(layoutName,+$('count').value);active=0;positionFields();schedule();});
for(const field of fields)$(field).addEventListener('input',schedule);$('scene').addEventListener('change',schedule);
function settingsURL(){const p=params(),url=new URL(location.pathname,location.origin);url.searchParams.set('v','1');for(const name of ['frequency','duration','declination','noise','separation','scene'])url.searchParams.set(name,p[name]);url.searchParams.set('ant',p.antennas.map(a=>`${a.x},${a.y}`).join(';'));url.hash='laboratorio';return url.href;}
$('share').addEventListener('click',async()=>{const url=settingsURL();$('share-box').hidden=false;$('share-url').value=url;try{await navigator.clipboard.writeText(url);$('action-status').textContent='Enlace copiado. Incluye antenas, fuente y parámetros del modelo.';}catch{$('share-url').focus();$('share-url').select();$('action-status').textContent='Copia el enlace del campo: contiene esta configuración.';}});
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('csv').addEventListener('click',()=>{
  if(!last||busy)return;const rows=['# Cuaderno celeste · simulación didáctica, no observaciones reales',`# Parámetros: ${JSON.stringify(last.params)}`,`# Componentes del cielo (ángulos en radianes): ${JSON.stringify(last.result.components)}`,'# Los conjugados se incluyen como filas; no son medidas independientes.','pair,hour_angle_h,u_lambda,v_lambda,real,imaginary,conjugate'];
  for(const s of last.result.samples){rows.push([s.pair,s.hours,s.u,s.v,s.re,s.im,0].join(','));rows.push([s.pair,s.hours,-s.u,-s.v,s.re,-s.im,1].join(','));}
  download(rows.join('\n')+'\n','text/csv;charset=utf-8','interferometro-medidas.csv');$('action-status').textContent='Medidas sintéticas descargadas. Incluyen parámetros y conjugados identificados.';
});
$('png').addEventListener('click',()=>{
  if(!last||busy)return;const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=940;const ctx=canvas.getContext('2d');ctx.fillStyle='#f1f0e8';ctx.fillRect(0,0,1600,940);ctx.fillStyle='#17333a';ctx.font='32px sans-serif';ctx.fillText('Muchas antenas, una mirada · Cuaderno celeste',45,60);ctx.font='17px sans-serif';const p=last.params;ctx.fillText(`${p.antennas.length} antenas · ${p.frequency} GHz · ${p.duration} h · δ ${p.declination}° · σ ${p.noise} · ${p.scene}`,45,98);
  [['array','Antenas en el terreno'],['sky','Cielo simulado'],['uv','Cobertura (u, v)'],['dirty','Imagen sucia'],['beam','Haz sucio']].forEach(([id,label],i)=>{const x=45+i%3*520,y=145+Math.floor(i/3)*370;ctx.font='20px sans-serif';ctx.fillText(label,x,y);const source=$(id);ctx.drawImage(source,x,y+17,330,330*source.height/source.width);});ctx.font='15px sans-serif';ctx.fillText('Simulación de campo pequeño. Colores normalizados por mapa. Sin CLEAN.',1085,570,450);ctx.fillText(`Escala λ/B proyectada: ${fmt(last.result.resolution)}″`,1085,605,450);ctx.fillText('Suma directa de Fourier. Pesos iguales. Semilla 42.',1085,640,450);ctx.fillText('Fuentes: NRAO; Atemkeng et al. (2016), doi:10.1093/mnras/stw1656.',45,905);
  canvas.toBlob(blob=>{if(blob){download(blob,'image/png','interferometro.png');$('action-status').textContent='Figura PNG guardada con parámetros, unidades y fuentes.';}},'image/png');
});
$('reset').addEventListener('click',()=>{layoutName='y';antennas=M.layout('y',6);active=0;$('count').value='6';$('scene').value='binary';for(const [key,value] of Object.entries({frequency:10,duration:4,declination:35,noise:0,separation:30}))$(key).value=value;$('share-box').hidden=true;$('action-status').textContent='Configuración inicial restaurada.';positionFields();schedule();});
function restore(){
  const q=new URLSearchParams(location.search);if(!q.has('v')&&!q.has('ant'))return;
  try{
    if(q.get('v')!=='1'||location.search.length>4000)throw Error();
    const saved={};for(const [key,min,max] of [['frequency',1,30],['duration',0,12],['declination',-30,70],['noise',0,.2],['separation',10,70]]){const value=Number(q.get(key));if(q.get(key)===null||!Number.isFinite(value)||value<min||value>max)throw Error();saved[key]=value;}
    if(!['binary','point','extended','ring'].includes(q.get('scene')))throw Error();
    const next=q.get('ant').split(';').map(pair=>{const parts=pair.split(',');if(parts.length!==2||parts.some(v=>!v.trim()))throw Error();return {x:Number(parts[0]),y:Number(parts[1])};});
    M.sample({...saved,scene:q.get('scene'),antennas:next});antennas=next;layoutName='custom';$('count').value=String(next.length);$('scene').value=q.get('scene');for(const field of fields)$(field).value=saved[field];
  }catch{$('action-status').textContent='El enlace tiene parámetros no válidos. Se ha abierto la configuración inicial.';}
}
restore();positionFields();schedule();
