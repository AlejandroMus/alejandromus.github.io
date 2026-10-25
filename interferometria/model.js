/* Modelo didáctico propio. Referencias, convenciones y límites: FUENTES.md. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Interferometry=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const C=299792458,ARCSEC=Math.PI/(180*3600),RAD=Math.PI/180,FIELD=120;
  function layout(kind,count=6){
    if(!Number.isInteger(count)||count<3||count>8)throw Error('Elige entre 3 y 8 antenas.');
    return Array.from({length:count},(_,i)=>{
      if(kind==='line')return {x:-160+320*i/(count-1),y:0};
      if(kind==='circle'){const a=2*Math.PI*i/count;return {x:150*Math.cos(a),y:150*Math.sin(a)};}
      if(i===0)return {x:0,y:0};const arm=(i-1)%3,level=Math.floor((i-1)/3)+1,a=arm*2*Math.PI/3+Math.PI/6,r=45+level*40;
      return {x:r*Math.cos(a),y:r*Math.sin(a)};
    });
  }
  function scene(kind,separation=30){
    const gaussian=(x,y,flux,sx,sy=sx)=>({l:x*ARCSEC,m:y*ARCSEC,flux,sx:sx*ARCSEC,sy:sy*ARCSEC});
    if(kind==='point')return [gaussian(0,0,1,0)];
    if(kind==='extended')return [gaussian(0,0,1,10,6)];
    if(kind==='ring')return Array.from({length:16},(_,i)=>{const a=2*Math.PI*i/16;return gaussian(20*Math.cos(a),20*Math.sin(a),1/16,1.8);});
    return [gaussian(-separation/2,0,1/1.65,2),gaussian(separation/2,0,.65/1.65,2)];
  }
  function visibility(components,u,v){
    let re=0,im=0;
    for(const s of components){const attenuation=Math.exp(-2*Math.PI*Math.PI*(s.sx*s.sx*u*u+s.sy*s.sy*v*v)),phase=2*Math.PI*(u*s.l+v*s.m),amp=s.flux*attenuation;re+=amp*Math.cos(phase);im-=amp*Math.sin(phase);}
    return {re,im};
  }
  function project(east,north,hours,declination,latitude=40){
    const H=hours*Math.PI/12,d=declination*RAD,p=latitude*RAD,X=-north*Math.sin(p),Y=east,Z=north*Math.cos(p);
    return {u:X*Math.sin(H)+Y*Math.cos(H),v:-X*Math.sin(d)*Math.cos(H)+Y*Math.sin(d)*Math.sin(H)+Z*Math.cos(d)};
  }
  function random(seed=42){let s=seed>>>0;return ()=>{s=(1664525*s+1013904223)>>>0;return (s+.5)/4294967296;};}
  function sample(params){
    const {antennas,frequency,duration,declination,noise=0}=params;
    if(!Array.isArray(antennas)||antennas.length<3||antennas.length>8||!antennas.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&Math.abs(a.x)<=180&&Math.abs(a.y)<=180))throw Error('La distribución de antenas no es válida.');
    if(!(frequency>=1&&frequency<=30&&duration>=0&&duration<=12&&declination>=-30&&declination<=70&&noise>=0&&noise<=.2))throw Error('Los parámetros están fuera del intervalo admitido.');
    const wavelength=C/(frequency*1e9),components=scene(params.scene,params.separation),samples=[],rng=random(42);
    const steps=duration===0?1:Math.ceil(duration*4)+1;
    let maxBaseline=0,maxProjected=0;
    const hours=[];
    for(let t=0;t<steps;t++){
      const hour=steps===1?0:-duration/2+duration*t/(steps-1),d=declination*RAD,p=40*RAD;
      if(Math.sin(p)*Math.sin(d)+Math.cos(p)*Math.cos(d)*Math.cos(hour*Math.PI/12)<=0)continue;
      hours.push(hour);
      for(let i=0;i<antennas.length;i++)for(let j=i+1;j<antennas.length;j++){
        const east=antennas[j].x-antennas[i].x,north=antennas[j].y-antennas[i].y,baseline=Math.hypot(east,north);
        if(baseline<5)throw Error('Separa las antenas al menos 5 metros.');
        const projected=project(east,north,hour,declination),u=projected.u/wavelength,v=projected.v/wavelength,V=visibility(components,u,v);
        const amplitude=Math.sqrt(-2*Math.log(rng()))*noise,phase=2*Math.PI*rng();
        samples.push({u,v,re:V.re+amplitude*Math.cos(phase),im:V.im+amplitude*Math.sin(phase),hours:hour,pair:`${i+1}-${j+1}`});
        maxBaseline=Math.max(maxBaseline,baseline);maxProjected=Math.max(maxProjected,Math.hypot(projected.u,projected.v));
      }
    }
    if(!samples.length)throw Error('La fuente no está sobre el horizonte en este intervalo.');
    return {samples,components,wavelength,maxBaseline,maxProjected,hours,resolution:maxProjected?wavelength/maxProjected/ARCSEC:null};
  }
  function reconstruct(samples,size=64){
    if(!samples.length)throw Error('Faltan muestras para reconstruir.');
    const image=new Float32Array(size*size),beam=new Float32Array(size*size),step=FIELD*ARCSEC/size;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const l=(x-size/2)*step,m=(size/2-y)*step;let value=0,response=0;
      for(const s of samples){const phase=2*Math.PI*(s.u*l+s.v*m),cos=Math.cos(phase);value+=s.re*cos-s.im*Math.sin(phase);response+=cos;}
      image[y*size+x]=value/samples.length;beam[y*size+x]=response/samples.length;
    }
    return {image,beam};
  }
  function skyImage(components,size=64){
    const sky=new Float32Array(size*size),step=FIELD*ARCSEC/size;
    for(const s of components){
      if(s.sx===0){const x=Math.round(s.l/step+size/2),y=Math.round(size/2-s.m/step);if(x>=0&&x<size&&y>=0&&y<size)sky[y*size+x]+=s.flux/(step*step);continue;}
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){const l=(x-size/2)*step,m=(size/2-y)*step;sky[y*size+x]+=s.flux/(2*Math.PI*s.sx*s.sy)*Math.exp(-.5*((l-s.l)**2/s.sx**2+(m-s.m)**2/s.sy**2));}
    }
    return sky;
  }
  function simulate(params,size=64){const data=sample(params),images=reconstruct(data.samples,size);return {...data,...images,sky:skyImage(data.components,size),size};}
  return {C,ARCSEC,FIELD,layout,scene,visibility,project,sample,reconstruct,skyImage,simulate};
});
