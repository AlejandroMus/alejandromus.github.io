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
test('La función de Bessel coincide con valores tabulados y conserva el límite en cero',()=>{
  for(const [x,j] of [[0,0],[1,.4400505857449335],[5,-.3275791375914652],[10,.04347274616886144],[20,.06683312417585005]])close(M.besselJ1(x),j,1e-12);
  close(M.jinc(0),1);close(M.jinc(1e-8),1);
});
test('El anillo tiene simetría circular, centro vacío y flujo unitario',()=>{
  const ring=M.scene('ring');assert.equal(ring.length,1);assert.equal(ring[0].type,'annulus');
  close(M.visibility(ring,0,0).re,1);
  for(const q of [0,1500,5000,15000,40000]){const a=M.visibility(ring,q,0);for(const t of [.2,.7,1.6,2.5]){const b=M.visibility(ring,q*Math.cos(t),q*Math.sin(t));close(a.re,b.re,1e-12);close(b.im,0);}}
  const size=128,image=M.skyImage(ring,size),step=M.FIELD*M.ARCSEC/size;
  assert.equal(image[size/2*size+size/2],0);
  const flux=image.reduce((sum,value)=>sum+value,0)*step*step;close(flux,1,.01);
  // Dentro de la corona, el brillo no depende de la dirección.
  const radius=21,center=size/2;close(image[center*size+center+radius],image[(center+radius)*size+center],1e-3);
});
