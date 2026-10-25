# alejandromus.github.io

Web personal y cuaderno de astronomía y matemáticas de Alejandro. Las
experiencias estáticas funcionan directamente en GitHub Pages:

- `saros/`: atlas y explicación matemática de las series Saros solares.
- `orbitas/`: simuladores 3D de dos y tres cuerpos y juego de misión a L2.
- `luna/`: calculadora lunar con mapa oficial de los 53 municipios de Mallorca,
  búsqueda local de lugares y entrada de coordenadas, fase, salida, puesta y
  altura máxima; fuentes y metodología en
  [luna/FUENTES.md](luna/FUENTES.md).

Los datos del atlas se exportan desde el catálogo de NASA/GSFC para que la web
no dependa de un servidor Python.

- `interferometria/`: diseño de un interferómetro, cobertura uv, imagen sucia,
  haz, configuración compartible y exportación de datos y figuras. Fuentes y
  límites en [interferometria/FUENTES.md](interferometria/FUENTES.md).
- `privacidad/`: estado de la integración opcional de estadísticas y exclusión
  del navegador. No contiene una zona de administración pública.

Perfil, foto, CV, publicaciones, entrevistas y estadísticas se configuran en
`site.config.js`. Guía: [docs/PERFIL-Y-ESTADISTICAS.md](docs/PERFIL-Y-ESTADISTICAS.md).
No se publican perfiles ni entrevistas ficticios. Las estadísticas están
desactivadas hasta tener una cuenta y configurar su acceso privado.

Vista local: `python3 -m http.server 4173` desde esta carpeta.
Pruebas: `node --test interferometria/model.test.cjs analytics.test.cjs`.
