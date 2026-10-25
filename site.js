(function(){
  'use strict';
  const config=globalThis.CuadernoConfig||{},profile=config.profile||{};
  const $=id=>document.getElementById(id);
  function safeUrl(value,local=false){
    if(typeof value!=='string'||!value.trim())return null;
    try{const url=new URL(value,location.href);if(!['https:','http:'].includes(url.protocol))return null;if(!local&&url.origin===location.origin)return null;return url.href;}catch{return null;}
  }
  document.querySelectorAll('[data-author]').forEach(node=>node.textContent=profile.name||'Alejandro');
  if(profile.headline)$('profile-headline').textContent=profile.headline;
  if(profile.bio)$('profile-bio').textContent=profile.bio;
  const bioSource=safeUrl(profile.bioSource);
  if(bioSource){const p=document.createElement('p'),a=document.createElement('a');p.className='profile-source';a.href=bioSource;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Trayectoria y perfiles académicos · Instituto de Astrofísica de FORTH ↗';p.append(a);$('profile-bio').after(p);}
  const links=[['ORCID',profile.orcid],['Google Scholar',profile.scholar],['GitHub',profile.github],['CV completo ↓',profile.cv,true]];
  for(const [name,value,local] of links){const href=safeUrl(value,local);if(!href)continue;const a=document.createElement('a');a.textContent=name;a.href=href;if(!local){a.target='_blank';a.rel='noopener noreferrer';}else a.setAttribute('download','');$('profile-links').append(a);}
  if(profile.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)){const a=document.createElement('a');a.href=`mailto:${profile.email}`;a.textContent='Contacto ↗';$('profile-links').append(a);}
  const photo=safeUrl(profile.photo,true);
  if(photo){const image=$('portrait-image');image.alt=profile.photoAlt||`Retrato de ${profile.name||'Alejandro'}`;image.onload=()=>{$('portrait').hidden=false;$('hero-system').hidden=true;};image.src=photo;$('portrait-caption').textContent=profile.photoCaption||'';}
  const publications=(config.research?.publications||[]).filter(p=>p.title&&safeUrl(p.url));
  if(publications.length||config.research?.intro){$('investigacion').hidden=false;document.querySelector('[data-research-nav]').hidden=false;$('research-intro').textContent=config.research.intro||'';
    for(const p of publications){const card=document.createElement('article'),title=document.createElement('h3'),a=document.createElement('a'),description=document.createElement('p'),meta=document.createElement('p');a.href=safeUrl(p.url);a.textContent=p.title;a.target='_blank';a.rel='noopener noreferrer';title.append(a);description.textContent=p.description||'';meta.className='publication-meta';meta.textContent=[p.year,p.venue].filter(Boolean).join(' · ');card.append(meta,title,description);$('publications').append(card);}}
  const interviews=(config.interviews||[]).filter(p=>p.title&&safeUrl(p.url));
  if(interviews.length){$('entrevistas').hidden=false;document.querySelector('[data-interviews-nav]').hidden=false;
    for(const p of interviews){const card=document.createElement('a');card.href=safeUrl(p.url);card.target='_blank';card.rel='noopener noreferrer';const meta=document.createElement('p'),title=document.createElement('h3'),description=document.createElement('p'),more=document.createElement('span');meta.className='interview-meta';meta.textContent=[p.outlet,p.date].filter(Boolean).join(' · ');title.textContent=p.title;description.textContent=p.description||'';more.textContent='Abrir entrevista ↗';card.append(meta,title,description,more);$('interview-list').append(card);}}
})();
