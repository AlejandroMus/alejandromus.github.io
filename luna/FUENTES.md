# La Luna sobre Mallorca: fuentes y método

Datos recuperados el 11 de octubre de 2026. La página no consulta servicios
externos para calcular las efemérides ni para dibujar el mapa.

## Motor astronómico

Astronomy Engine, Don Cross, revisión
[`865d3da7d8112bbc7911238052c6af4aaf877181`](https://github.com/cosinekitty/astronomy/tree/865d3da7d8112bbc7911238052c6af4aaf877181).
Archivo `source/js/astronomy.browser.min.js`, conservado en `vendor/`.
Licencia MIT completa en `vendor/LICENSE` y en la cabecera del motor.
[Documentación de esta revisión](https://github.com/cosinekitty/astronomy/blob/865d3da7d8112bbc7911238052c6af4aaf877181/source/js/README.md).

- `MoonPhase`: diferencia de longitud eclíptica Sol–Luna, en grados.
- `Illumination.phase_fraction`: fracción iluminada del disco.
- `Equator(Moon, date, observer, true, true)`: posición topocéntrica de fecha.
- `Horizon(..., 'normal')`: altura aparente del centro del disco.
- `SearchRiseSet`: cruce del borde superior, con refracción estándar.

La fase y la fracción se evalúan a las 12:00 locales. Los intervalos
0–90°, 90–180°, 180–270° y 270–360° se etiquetan creciente, gibosa creciente,
gibosa menguante y menguante. A menos de 1° de una fase principal se indica
«Cerca de…», sin afirmar que su instante exacto ocurra al mediodía.
Los eventos de salida y puesta se redondean al minuto más próximo.

Observador a nivel del mar, sin relieve ni horizonte de edificios. La posición
de la lista es un centroide del polígono principal si está dentro; en caso
contrario se selecciona un punto interior. Un clic usa la posición del clic.
Las coordenadas siempre se muestran para que el usuario sepa qué se calcula.

El máximo es del día civil completo, incluyendo los límites. Se muestrea cada
cinco minutos o menos; todos los máximos locales se refinan por búsqueda
ternaria a un intervalo de menos de un segundo. La gráfica conecta muestras.
El dibujo lunar es código propio que representa una esfera iluminada con la
fracción calculada; su textura es decorativa. No modela libración, relieve,
rotación de campo ni inclinación del terminador respecto al horizonte.

## Cartografía

[IDEIB, Govern de les Illes Balears: Municipis Illes Balears](https://ideib.caib.es/geoserveis/rest/services/public/GOIB_UnitAdm_IB/MapServer/1).
[Catálogo del conjunto de datos y licencia CC BY](https://datos.gob.es/es/catalogo/a04003003-municipios1).

Consulta utilizada:

```text
https://ideib.caib.es/geoserveis/rest/services/public/GOIB_UnitAdm_IB/MapServer/1/query
where=NOM_CONSELL_ILLA='Mallorca'
outFields=ID,NOM
outSR=4326
geometryPrecision=5
maxAllowableOffset=0.0006
f=geojson
```

53 municipios, geometrías Polygon/MultiPolygon. Límites simplificados por el
servicio para visualización, no para usos legales o catastrales. El mapa SVG
usa una proyección equirectangular con coseno de latitud 39,6° y permite
selección con ratón, toque o teclado.

## Explicaciones, hora civil y diseño

- [NASA Science: Moon Phases](https://science.nasa.gov/moon/moon-phases/):
  explicación de las fases y distinción frente a los eclipses.
- [USNO: Altitude and Azimuth](https://aa.usno.navy.mil/faq/alt_az): coordenadas
  horizontales y transformación geométrica.
- [USNO: Complete Sun and Moon Data for One Day](https://aa.usno.navy.mil/data/RS_OneDay.html)
  y [API](https://aa.usno.navy.mil/data/api.html): contraste de resultados.
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
  e [IANA Time Zone Database](https://www.iana.org/time-zones): zona
  `Europe/Madrid`, con las reglas incluidas en el navegador. No se asume que
  todos los días tengan 24 horas; los cambios de horario se tratan por fecha.
- Tipografías del diseño existente, servidas por Google Fonts:
  [Manrope](https://fonts.google.com/specimen/Manrope),
  [DM Mono](https://fonts.google.com/specimen/DM+Mono) y
  [Newsreader](https://fonts.google.com/specimen/Newsreader).
  Sus repositorios y licencias se enlazan en las fichas de Google Fonts.
  Hay fuentes de sistema de respaldo si no se puede acceder al servicio.

Interfaz, texto explicativo, mapa, dibujo y gráfico propios; no se usan imágenes
ni teselas de terceros. La dependencia astronómica y la cartografía se alojan
en el repositorio para que la calculadora funcione en GitHub Pages.
