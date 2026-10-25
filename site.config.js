/* Configuración PÚBLICA. No guardar contraseñas, tokens ni claves API aquí.
   Guía: docs/PERFIL-Y-ESTADISTICAS.md */
globalThis.CuadernoConfig = {
  profile: {
    name: 'Alejandro',
    headline: 'Astronomía, matemáticas y código para explorar el cielo.',
    bio: 'Este es mi cuaderno de experimentos científicos: un espacio para explorar ideas, poner a prueba la intuición y compartir las preguntas que aparecen por el camino.',
    photo: '',
    photoAlt: '',
    photoCaption: '',
    cv: '',
    orcid: '',
    scholar: '',
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
