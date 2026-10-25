/* Configuración PÚBLICA. No guardar contraseñas, tokens ni claves API aquí.
   Guía: docs/PERFIL-Y-ESTADISTICAS.md */
globalThis.CuadernoConfig = {
  profile: {
    name: 'Alejandro Mus',
    headline: 'Astrofísica, radiointerferometría y reconstrucción de imágenes.',
    bio: 'Trabajo en radiointerferometría y reconstrucción de imágenes astronómicas, con interés en los núcleos activos de galaxias y las observaciones de muy larga base en radio y ondas milimétricas. Me formé en la Universitat de les Illes Balears y en la Université Paris-Saclay, y me doctoré en la Universitat de València en 2023. Aquí comparto el lado más práctico de esas preguntas: cómo observamos el cielo, qué podemos deducir de las medidas y dónde están los límites de nuestras imágenes.',
    bioSource: 'https://www.ia.forth.gr/node/1321',
    photo: '',
    photoAlt: '',
    photoCaption: '',
    cv: '',
    orcid: 'https://orcid.org/0000-0003-0329-6874',
    scholar: 'https://scholar.google.es/citations?user=nbA_-ZcAAAAJ',
    github: 'https://github.com/AlejandroMus',
    email: ''
  },
  // Secciones visibles solo cuando hay contenido real.
  research: { intro: '', publications: [] },
  // { title, outlet, date: 'AAAA-MM-DD', description, url }
  interviews: [],
  analytics: {
    enabled: false,
    // Solo el identificador público de tu sitio, sin '.goatcounter.com'.
    goatcounterCode: '',
    productionHost: 'alejandromus.github.io'
  }
};
