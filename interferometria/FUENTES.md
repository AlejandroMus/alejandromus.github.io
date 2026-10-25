# Modelo de interferometría

Simulador didáctico propio, sin datos de telescopios reales ni librerías de
procesado externas. Las imágenes no son fotografías: se generan a partir de
escenas analíticas y medidas complejas sintéticas.

## Referencias primarias

1. [NRAO: Introduction to Radio Interferometry](https://science.nrao.edu/facilities/alma/naasc-workshops/nrao-cd-wyoming20/03Interferometry_Basics_AA.pdf).
   Material del taller de Wyoming de 2020: síntesis de apertura, resolución,
   pares conjugados y cambio de cobertura con la rotación terrestre.
2. [Atemkeng et al. (2016), MNRAS, doi:10.1093/mnras/stw1656](https://doi.org/10.1093/mnras/stw1656).
   Apartado 2.2: integral de visibilidad y suma de contribuciones a la imagen.
3. [NRAO: AIPS Cookbook, capítulo 5](https://www.aips.nrao.edu/CookHTML/CookBookch5.html).
   Medidas, imagen sucia, pesos y deconvolución.
4. [NRAO: AIPS++ Glossary, D](https://casa.nrao.edu/aips2_docs/glossary/d.html).
   Definiciones de transformada directa, imagen sucia y haz sucio.

## Convenciones y derivación de la proyección

Antenas en un plano local este–norte, coordenadas en metros, a latitud
idealizada φ = 40° N. Para cada diferencia de antenas (ΔE, ΔN, ΔU = 0),
el giro a ejes ecuatoriales con longitud local cero da
X = −ΔN sin φ, Y = ΔE, Z = ΔN cos φ.

Proyectamos sobre los vectores unitarios eᵤ = (sin H, cos H, 0) y
eᵥ = (−sin δ cos H, sin δ sin H, cos δ). Sus productos escalares con
(X,Y,Z), divididos por λ = c/ν, son u y v. Esta derivación es propia y
declara explícitamente la convención para evitar mezclar ejes. H está
en horas (π/12 rad/h), δ y φ se convierten de grados a radianes.
La duración solicitada se distribuye alrededor de H = 0, con pasos de
como máximo 15 minutos. Se omiten puntos con altura geométrica ≤ 0.

Cada par de antenas aporta una medida compleja por instante. Los conjugados
se dibujan en el plano uv y se incluyen identificados en el CSV; no se tratan
como dos medidas de ruido independientes. La mayor base física y la mayor
base proyectada se calculan por separado. λ/B proyectada es una escala
orientativa y no el FWHM del haz.

## Modelo de cielo y reconstrucción

- Fuente puntual: delta en el origen, flujo 1.
- Dos fuentes: gaussianas circulares σ = 2″, separadas entre 10″ y 70″,
  con flujos relativos 1 y 0,65, normalizados a flujo total 1.
- Fuente extendida: gaussiana elíptica σₓ = 10″, σᵧ = 6″.
- Anillo: corona circular continua de brillo uniforme, con radio interior de
  17″ y exterior de 23″, centrada en el origen y con flujo total 1.

El anillo se calcula como la diferencia de dos discos uniformes:

```text
q = √(u² + v²)
D(R,q) = 2 J₁(2πRq) / (2πRq), con D(R,0) = 1
V(q) = [Rₒ² D(Rₒ,q) − Rᵢ² D(Rᵢ,q)] / (Rₒ² − Rᵢ²)
```

La visibilidad del disco se documenta en el [calculador de ESO](https://etimecal.hq.eso.org/observing/etc/doc/viscalc/helpvlti.htm).
La diferencia ponderada se deduce por linealidad de la transformada de Fourier.
La función de Bessel se evalúa por cuadratura de su
[representación integral, NIST DLMF §10.9](https://dlmf.nist.gov/10.9).
El brillo es uniforme en todas las direcciones del anillo. El dibujo integra
la cobertura de cada píxel con submuestreo 4 × 4 en sus bordes.

Las visibilidades de una gaussiana son
F exp[−2π²(σₓ²u² + σᵧ²v²)] exp[−2πi(ul₀+vm₀)].
Se suman las componentes y se añade ruido gaussiano de media cero por
componente real e imaginaria. Se utiliza Box–Muller con un generador
congruencial de semilla 42. Así, la misma configuración es reproducible.

La imagen sucia se evalúa mediante suma de Fourier inversa directa, con
pesos iguales y normalización 1/M; el haz usa las mismas posiciones y pesos
con visibilidades unidad. La rejilla es 64 × 64, sobre 120″ por lado.
No se usa FFT, interpolación uv ni CLEAN. Los mapas se muestran normalizados
por su propio máximo absoluto; azul indica contribuciones negativas,
dorado positivas. El muestreo de la imagen puntual usa un píxel central.

Sin haz primario, término w, errores de calibración, atmósfera, RFI,
ancho de banda ni espectro de la fuente. Mantener el cielo igual al variar
ν permite explorar solo el cambio del muestreo. No es una herramienta
para planificar una observación real ni para medir flujos de los mapas.

## Fotografía del observatorio

La fotografía de ALMA procede de [ESO: ALMA antennas](https://www.eso.org/public/images/alma-osf-hh_1257-cc/).
Crédito: **ESO**. Licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
según [las condiciones de uso de ESO](https://www.eso.org/public/outreach/copyright/).
Es una fotografía de contexto, no una observación del cielo ni una imagen
producida por este simulador. La distribución simulada no pretende representar
el observatorio ALMA. Detalles de descarga y uso en `assets/FUENTES.md`.

## Reproducibilidad

«Compartir» incluye posiciones de antenas y parámetros, con versión de
formato v=1. Los CSV contienen muestras y conjugados marcados. La figura
PNG incluye parámetros y fuentes. El modelo se ejecuta en un Web Worker
para mantener manejables los controles; hay un respaldo en el hilo principal.
Las pruebas numéricas están en `model.test.cjs`.

Tipografías de la web: Manrope, DM Mono y Newsreader, servidas por Google Fonts
y enlazadas en la página. Diseño, texto, diagramas y código propios.
