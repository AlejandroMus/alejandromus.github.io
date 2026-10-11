const test=require('node:test');
const assert=require('node:assert/strict');
const L=require('./core.js');

test('El día civil de Mallorca respeta los cambios de horario',()=>{
  for(const [date,hours] of [['2026-03-29',23],['2026-10-25',25],['2026-10-11',24]]) {
    const {start,end}=L.dayBounds(date);
    assert.equal((end-start)/3600000,hours);
    assert.equal(L.parts(start).hour,0);
    assert.equal(L.parts(end).hour,0);
    assert.equal(L.parts(L.localTime(date,12)).hour,12);
  }
});

test('Palma coincide con los eventos del USNO (2026-10-11)',()=>{
  // USNO, recuperado 2026-10-11, coordenadas 39.57 N, 2.65 E, UTC+2:
  // https://aa.usno.navy.mil/api/rstt/oneday?date=2026-10-11&coords=39.57,2.65&tz=2
  // Rise 08:45, Set 19:22, fracción al mediodía 1% (redondeada).
  const r=L.calculate('2026-10-11',39.57,2.65);
  assert.ok(Math.abs(r.rises[0]-new Date('2026-10-11T06:45:00Z'))<90000);
  assert.ok(Math.abs(r.sets[0]-new Date('2026-10-11T17:22:00Z'))<90000);
  assert.equal(Math.round(r.fraction*100),1);
  assert.equal(r.name,'Creciente');
});

test('El máximo incluye medianoche y supera una malla independiente de un minuto',()=>{
  for(const date of ['2026-10-11','2026-03-29','2026-10-25']) {
    const r=L.calculate(date,39.57,2.65);
    for(let t=+r.start;t<+r.end;t+=60000)assert.ok(r.maximum.altitude+0.0001>=L.position(new Date(t),r.observer).altitude);
    assert.ok(r.maximum.time>=r.start&&r.maximum.time<r.end);
  }
});

test('Los eventos nunca se toman de otro día y se admite una salida o puesta ausente',()=>{
  let absent=false;
  for(let day=1;day<=31;day++) {
    const date=`2026-10-${String(day).padStart(2,'0')}`,r=L.calculate(date,39.57,2.65);
    for(const time of [...r.rises,...r.sets])assert.ok(time>=r.start&&time<r.end);
    if(!r.rises.length||!r.sets.length)absent=true;
  }
  assert.ok(absent);
});

test('Fechas fuera del intervalo y fechas imposibles se rechazan',()=>{
  for(const date of ['1899-12-31','2101-01-01','2026-02-30','2026-13-01','2026-01-00','no-fecha'])assert.throws(()=>L.calculate(date,39.57,2.65));
});
