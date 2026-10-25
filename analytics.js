/* Integración opcional de GoatCounter. Fuentes: docs/PERFIL-Y-ESTADISTICAS.md */
(function(){
  'use strict';
  const config=globalThis.CuadernoConfig?.analytics;
  const key='cuaderno-no-estadisticas';
  function excluded(){try{return localStorage.getItem(key)==='1';}catch{return false;}}
  function setExcluded(value){try{if(value)localStorage.setItem(key,'1');else localStorage.removeItem(key);}catch{}}
  const choice=new URLSearchParams(location.search).get('sin-estadisticas');
  if(choice==='1')setExcluded(true);
  if(choice==='0')setExcluded(false);
  const ready=Boolean(config?.enabled&&/^[a-z0-9][a-z0-9-]{0,62}$/.test(config.goatcounterCode||''));
  const isProduction=location.hostname===config?.productionHost;
  globalThis.CuadernoAnalytics={configured:ready,excluded:excluded(),exclude:setExcluded};
  if(!ready||!isProduction||excluded()||choice==='1')return;
  globalThis.goatcounter={
    no_events:true,
    path:()=>location.pathname.replace(/index\.html$/,''),
    referrer:()=>{try{return document.referrer?new URL(document.referrer).origin:'';}catch{return '';}}
  };
  const script=document.createElement('script');script.async=true;
  script.src='https://gc.zgo.at/count.js';
  script.setAttribute('data-goatcounter',`https://${config.goatcounterCode}.goatcounter.com/count`);
  document.head.append(script);
})();
