const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'analytics.js'),'utf8');
function run(options={}){
  const appended=[],store=new Map(options.excluded?[['cuaderno-no-estadisticas','1']]:[]);
  const context={CuadernoConfig:{analytics:{enabled:options.enabled??false,goatcounterCode:options.site??'cuaderno-prueba',productionHost:'alejandromus.github.io'}},URL,URLSearchParams,
    location:{hostname:options.host||'alejandromus.github.io',search:options.query||'',pathname:'/luna/index.html'},
    document:{referrer:'https://example.org/entrevista?dato=privado',createElement:()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v;}}),head:{append(s){appended.push(s);}}},
    localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}};
  vm.createContext(context);vm.runInContext(code,context);return {context,appended,store};
}
test('El contador no carga estando desactivado, sin sitio, en local o con exclusión',()=>{
  for(const options of [{},{enabled:true,site:''},{enabled:true,host:'localhost'},{enabled:true,excluded:true},{enabled:true,query:'?sin-estadisticas=1'}])assert.equal(run(options).appended.length,0);
});
test('La activación solo añade el script del proveedor con identificador público válido',()=>{
  const r=run({enabled:true});assert.equal(r.appended.length,1);assert.equal(r.appended[0].src,'https://gc.zgo.at/count.js');assert.equal(r.appended[0].attributes['data-goatcounter'],'https://cuaderno-prueba.goatcounter.com/count');
  assert.equal(run({enabled:true,site:'ejemplo.com/robado?token=secreto'}).appended.length,0);
});
test('No se envían parámetros de observación ni consultas del sitio de origen',()=>{
  const r=run({enabled:true,query:'?lugar=mi-casa&lat=39.5'});assert.equal(r.context.goatcounter.path(),'/luna/');assert.equal(r.context.goatcounter.referrer(),'https://example.org');
});
test('La exclusión se guarda y se puede retirar explícitamente',()=>{
  const a=run({enabled:true,query:'?sin-estadisticas=1'});assert.equal(a.store.get('cuaderno-no-estadisticas'),'1');
  const b=run({enabled:true,excluded:true,query:'?sin-estadisticas=0'});assert.equal(b.store.has('cuaderno-no-estadisticas'),false);assert.equal(b.appended.length,1);
});
