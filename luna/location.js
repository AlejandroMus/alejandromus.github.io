/* Selección geográfica y búsqueda local. Datos y licencia: FUENTES.md. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LunarLocation=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function polygons(feature){return feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;}
  function inside(point,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
  function municipalityAt(features,point){return features.find(f=>polygons(f).some(poly=>inside(point,poly[0])&&!poly.slice(1).some(h=>inside(point,h))))||null;}
  function parseCoordinates(latitude,longitude){
    function parse(value){const text=String(value).trim();if(!/^[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text))throw Error('Introduce latitud y longitud en grados decimales.');return Number(text.replace(',','.'));}
    const lat=parse(latitude),lon=parse(longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('La latitud debe estar entre −90 y 90 y la longitud entre −180 y 180.');
    return [lon,lat];
  }
  function inArea(features,point){
    const coordinates=features.flatMap(f=>polygons(f).flatMap(poly=>poly.flat()));
    const xs=coordinates.map(p=>p[0]),ys=coordinates.map(p=>p[1]);
    return point[0]>=Math.min(...xs)-.05&&point[0]<=Math.max(...xs)+.05&&point[1]>=Math.min(...ys)-.05&&point[1]<=Math.max(...ys)+.05;
  }
  function normalize(text){return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ca').replace(/[’'·-]/g,' ').replace(/\s+/g,' ').trim();}
  function searchPlaces(places,query,limit=12){
    const q=normalize(query);if(q.length<2)return [];
    const words=q.split(' ');
    return places.map(place=>{
      const names=[place.name,...(place.aliases||[])].map(normalize);
      const matching=names.filter(name=>words.every(word=>name.includes(word)));
      if(!matching.length)return null;
      const score=Math.min(...matching.map(name=>name===q?0:name.startsWith(q)?1:2));
      return {place,score};
    }).filter(Boolean).sort((a,b)=>a.score-b.score||(a.place.class==='P'?0:1)-(b.place.class==='P'?0:1)||a.place.name.localeCompare(b.place.name,'ca')).slice(0,limit).map(hit=>hit.place);
  }
  return {polygons,inside,municipalityAt,parseCoordinates,inArea,normalize,searchPlaces};
});
