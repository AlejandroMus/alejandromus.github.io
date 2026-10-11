const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),L=require('./location.js');
const features=JSON.parse(fs.readFileSync(path.join(__dirname,'municipios.geojson'))).features;
const places=JSON.parse(fs.readFileSync(path.join(__dirname,'lugares.json'))).places;

test('Las coordenadas admiten coma decimal, conservan el orden y rechazan errores',()=>{
  assert.deepEqual(L.parseCoordinates('39,5696','2,6502'),[2.6502,39.5696]);
  assert.deepEqual(L.parseCoordinates(' 39.5696 ',' 2.6502 '),[2.6502,39.5696]);
  for(const [lat,lon] of [['','2.65'],['91','2.65'],['39','181'],['hola','2'],['39,5,6','2']])assert.throws(()=>L.parseCoordinates(lat,lon));
});

test('La posición de Palma se asigna a Palma y Madrid queda fuera del área',()=>{
  const palma=[2.6502,39.5696];
  assert.equal(L.municipalityAt(features,palma).properties.NOM,'Palma');
  assert.equal(L.inArea(features,palma),true);
  assert.equal(L.inArea(features,[-3.7038,40.4168]),false);
  assert.equal(L.municipalityAt(features,[2.7,39.3]),null);
});

test('La búsqueda funciona sin tildes y devuelve lugares concretos',()=>{
  const found=L.searchPlaces(places,'port de soller');
  assert.ok(found.some(p=>p.name==='Port de Sóller'));
  assert.ok(L.searchPlaces(places,'deia').some(p=>p.name==='Deià'));
  assert.deepEqual(L.searchPlaces(places,'zzzzzzinexistente'),[]);
  assert.deepEqual(L.searchPlaces(places,''),[]);
  assert.ok(L.searchPlaces(places,'palma').length<=12);
});

test('Cada punto del catálogo tiene un municipio y coordenadas válidas en Mallorca',()=>{
  assert.ok(places.length>1000);
  assert.equal(new Set(places.map(p=>p.id)).size,places.length);
  for(const place of places){
    const coords=[place.longitude,place.latitude];
    assert.ok(L.inArea(features,coords));
    assert.equal(L.municipalityAt(features,coords)?.properties.NOM,place.municipality,place.name);
  }
});
