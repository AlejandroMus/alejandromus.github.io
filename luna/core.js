/* Cálculos propios sobre Astronomy Engine; referencias en FUENTES.md. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/astronomy.browser.min.js'));
  else root.Lunar = factory(root.Astronomy);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(A) {
  'use strict';
  const ZONE = 'Europe/Madrid', DAY = 86400000;
  const partsFormat = new Intl.DateTimeFormat('en-GB', {timeZone: ZONE, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  function parts(date) { return Object.fromEntries(partsFormat.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)])); }
  function localTime(iso, hour=0) {
    const [y,m,d] = iso.split('-').map(Number);
    const target=Date.UTC(y,m-1,d,hour); let utc=target;
    for(let i=0;i<5;i++) { const p=parts(new Date(utc)); const delta=target-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second); utc+=delta; if(!delta) break; }
    return new Date(utc);
  }
  function dayBounds(iso) {
    const [y,m,d]=iso.split('-').map(Number), next=new Date(Date.UTC(y,m-1,d+1)).toISOString().slice(0,10);
    return {start:localTime(iso),end:localTime(next)};
  }
  function position(date, observer) {
    const eq=A.Equator(A.Body.Moon,date,observer,true,true);
    return A.Horizon(date,observer,eq.ra,eq.dec,'normal');
  }
  function phaseName(angle) {
    if(angle<1||angle>359)return 'Cerca de Luna nueva';
    if(Math.abs(angle-90)<1)return 'Cerca del cuarto creciente';
    if(Math.abs(angle-180)<1)return 'Cerca de Luna llena';
    if(Math.abs(angle-270)<1)return 'Cerca del cuarto menguante';
    return angle<90?'Creciente':angle<180?'Gibosa creciente':angle<270?'Gibosa menguante':'Menguante';
  }
  function calculate(iso, latitude, longitude) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||iso<'1900-01-01'||iso>'2100-12-31') throw Error('Elige una fecha entre 1900 y 2100.');
    const {start,end}=dayBounds(iso);
    const p=parts(start),[year,month,day]=iso.split('-').map(Number);
    if(p.year!==year||p.month!==month||p.day!==day) throw Error('La fecha no es válida.');
    const observer=new A.Observer(latitude,longitude,0), span=end-start, noon=localTime(iso,12);
    const angle=A.MoonPhase(noon), fraction=A.Illumination(A.Body.Moon,noon).phase_fraction;
    function events(direction) {
      const found=[]; let cursor=start;
      for(let i=0;i<3&&cursor<end;i++) {
        const e=A.SearchRiseSet(A.Body.Moon,observer,direction,cursor,(end-cursor)/DAY);
        if(!e||e.date>=end) break;
        found.push(e.date); cursor=new Date(e.date.getTime()+1000);
      }
      return found;
    }
    const samples=[]; const count=Math.ceil(span/300000);
    for(let i=0;i<=count;i++) { const time=new Date(+start+Math.min(span-1,i*span/count)); samples.push({time,altitude:position(time,observer).altitude}); }
    let maximum=samples.reduce((a,b)=>a.altitude>b.altitude?a:b);
    // Busca todos los máximos locales y compara también los extremos del día.
    for(let i=1;i<samples.length-1;i++) if(samples[i].altitude>=samples[i-1].altitude&&samples[i].altitude>=samples[i+1].altitude) {
      let lo=+samples[i-1].time,hi=+samples[i+1].time;
      while(hi-lo>1000) { const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3; if(position(new Date(a),observer).altitude<position(new Date(b),observer).altitude) lo=a; else hi=b; }
      const time=new Date((lo+hi)/2),altitude=position(time,observer).altitude;
      if(altitude>maximum.altitude) maximum={time,altitude};
    }
    return {start,end,noon,angle,fraction,name:phaseName(angle),rises:events(1),sets:events(-1),samples,maximum,observer};
  }
  return {ZONE,parts,localTime,dayBounds,position,calculate,phaseName};
});
