const test=require('node:test'),assert=require('node:assert/strict'),M=require('./model.js');
const base=()=>({antennas:M.layout('y',6),frequency:10,duration:4,declination:35,noise:0,separation:30,scene:'binary'});
const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);

test('Cada pareja produce una medida compleja en una instantánea',()=>{
  for(const n of [3,4,5,6,7,8]){const r=M.sample({...base(),antennas:M.layout('circle',n),duration:0});assert.equal(r.samples.length,n*(n-1)/2);}
});
test('La visibilidad de cada modelo conserva el flujo cero y la simetría hermítica',()=>{
  for(const kind of ['point','binary','extended','ring']){
    const model=M.scene(kind,30),zero=M.visibility(model,0,0);close(zero.re,1);close(zero.im,0);
    const a=M.visibility(model,14000,-18000),b=M.visibility(model,-14000,18000);close(a.re,b.re);close(a.im,-b.im);
  }
});
test('Una fuente puntual central sin ruido reproduce el haz de muestreo',()=>{
  const r=M.simulate({...base(),scene:'point'},32);
  for(let i=0;i<r.image.length;i++)close(r.image[i],r.beam[i],1e-7);
  close(r.beam[16*32+16],1,1e-7);
});
test('La fase de Fourier coloca una fuente desplazada en el píxel correcto',()=>{
  const coords=M.sample(base()).samples,source=[{l:15*M.ARCSEC,m:0,flux:1,sx:0,sy:0}];
  const samples=coords.map(s=>({...s,...M.visibility(source,s.u,s.v)})),r=M.reconstruct(samples,64);
  close(r.image[32*64+40],1,1e-6);
  assert.ok(r.image[32*64+32]<.9);
});
test('La proyección preserva bases al cenit y nunca alarga el vector físico',()=>{
  const zenith=M.project(60,80,0,40);close(zenith.u,60);close(zenith.v,80);
  for(const H of [-6,-2,0,2,6])for(const d of [-30,0,35,70]){const r=M.project(60,80,H,d);assert.ok(Math.hypot(r.u,r.v)<=100+1e-10);}
});
test('Duplicar la frecuencia duplica u/v y divide por dos la escala angular',()=>{
  const a=M.sample({...base(),frequency:5}),b=M.sample({...base(),frequency:10});
  close(a.wavelength,2*b.wavelength);close(a.resolution,2*b.resolution);
  for(let i=0;i<a.samples.length;i++){close(2*a.samples[i].u,b.samples[i].u);close(2*a.samples[i].v,b.samples[i].v);}
});
test('El ruido es reproducible y los extremos de controles dan mapas finitos',()=>{
  const a=M.simulate({...base(),noise:.1},24),b=M.simulate({...base(),noise:.1},24);assert.deepEqual(a.image,b.image);
  for(const scene of ['point','binary','extended','ring']){const r=M.simulate({...base(),scene,frequency:30,duration:12,declination:-30,noise:.2,antennas:M.layout('line',8)},24);assert.ok([...r.image,...r.beam,...r.sky].every(Number.isFinite));assert.ok(r.hours.length<49);}
});
test('Se rechazan antenas inválidas o coincidentes',()=>{
  assert.throws(()=>M.sample({...base(),antennas:[{x:0,y:0},{x:0,y:0},{x:10,y:0}]}));
  assert.throws(()=>M.sample({...base(),frequency:0}));
  assert.throws(()=>M.sample({...base(),antennas:[{x:0,y:0},{x:190,y:0},{x:10,y:0}]}));
});
