# Perfil, entrevistas y estadísticas

La información personal se edita en `site.config.js`. Es un archivo público:
solo nombres, biografía, enlaces, rutas de imágenes y el identificador público
del sitio de estadísticas. Nunca contraseñas ni tokens. Las secciones de
investigación y entrevistas permanecen ocultas hasta tener contenido real.

## Completar el perfil

- `profile.name`, `headline` y `bio`: nombre profesional y presentación.
- `photo`: ruta a una foto propia, por ejemplo `assets/retrato.webp`.
  `photoAlt` debe describir la imagen y `photoCaption` identificar lugar,
  contexto y autoría cuando corresponda. Se conserva la ilustración del cielo
  hasta que la foto real cargue correctamente.
- `cv`: ruta al PDF público, por ejemplo `assets/cv.pdf`.
- `orcid`, `scholar`, `github`: enlaces completos a los perfiles correctos.
- `mirada`: enlace al grupo MIRADA de la UIB.
- `bioSource` y `bioSourceLabel`: enlace y etiqueta del perfil académico de la UIB.
- `email`: solo una dirección que quieras hacer pública.
- `research.publications`: objetos con `title`, `url`, `year`, `venue` y una
  `description` breve. `research.intro` presenta tus líneas de investigación.
- `interviews`: objetos con `title`, `outlet`, `date`, `description`, `url`.
  Son enlaces; no se cargan reproductores de terceros al abrir la portada.

No se han inventado afiliaciones, titulaciones, publicaciones ni entrevistas.

La referencia académica publicada es el [perfil de Alejandro Mus en la UIB](https://www.uib.es/personal/ABjI0NTI0Mw/).
La formación también se documenta en la [semblanza de Estalmat de la UIB](https://blocs.uib.cat/estalmat/professorat-25-26/).
Se enlaza directamente a [MIRADA — Modelización y Procesamiento de Datos Radioastronómicos](https://www.uib.es/recerca/estructures/estructura/MIRADA/).
El retrato personal sigue pendiente de recibir la fotografía original del
autor; la foto de ALMA solo ilustra el experimento de interferometría, con
crédito separado.

## Activar estadísticas privadas con GoatCounter

Se necesita una cuenta propia. La integración está desactivada hasta tenerla.

1. Registra tu sitio en [GoatCounter](https://www.goatcounter.com/) y configura
   el dominio `alejandromus.github.io`.
2. En los ajustes del sitio, establece **Dashboard viewable by → logged in
   users**. Desactiva el contador público; no publiques enlaces con tokens,
   claves API ni iframes con acceso secreto.
3. Guarda en `analytics.goatcounterCode` el identificador público del sitio,
   por ejemplo `mi-cuaderno`, y pon `analytics.enabled: true`.
4. Publica el cambio. Abre una página real, espera unos segundos y comprueba
   los datos en tu panel de GoatCounter con tu sesión iniciada.
5. En una ventana privada, sin iniciar sesión, abre el panel y verifica que
   exige autenticación. Esa configuración se comprueba en el proveedor, no
   puede imponerse desde el JavaScript público de GitHub Pages.

El código de seguimiento es público y sirve para registrar visitas, no para
leer estadísticas. El panel autenticado está en el proveedor. La web no
contiene una contraseña de administrador ni expone una API de consulta.

### Excluir tus visitas

Abre una vez `https://alejandromus.github.io/?sin-estadisticas=1` en cada
navegador que uses para desarrollar. La preferencia se conserva en
`localStorage`; vuelve a `?sin-estadisticas=0` para permitirlas. Si el navegador
bloquea ese almacenamiento, la exclusión solo se garantiza para la petición
con `sin-estadisticas=1`. La página de privacidad permite cambiar la opción.
No se carga el contador en localhost ni en otros dominios de prueba.

### Alcance del dato

Se registra la ruta sin parámetros ni fragmentos. Las búsquedas de lugares,
coordenadas y condiciones de los experimentos no se envían. El origen de
referencia se reduce al dominio. No se añaden eventos de interacción ni
grabaciones de sesiones. Los bloqueadores pueden impedir el registro.

Las visitas estimadas no equivalen a personas identificadas. GoatCounter usa
sesiones temporales; no ofrece un recuento infalible de personas distintas a
lo largo de toda la vida de la web. No hay datos anteriores a la activación.

## Fuentes del servicio

- [Integración oficial](https://www.goatcounter.com/help/start).
- [API JavaScript](https://www.goatcounter.com/help/js): carga y personalización.
- [Visitas y sesiones](https://www.goatcounter.com/help/sessions): definición
  y ventana temporal de identificación.
- [Excluir visitas propias](https://www.goatcounter.com/help/skip-dev).
- [Acceso al panel](https://www.goatcounter.com/help/frame): autenticación y
  distinción entre acceso privado, público y tokens.
- [Privacidad de GoatCounter](https://www.goatcounter.com/privacy).
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages): alojamiento estático.

La sección `privacidad/` refleja si el seguimiento está configurado y permite
excluir el navegador. Los detalles del proveedor y su configuración deberán
revisarse cuando se active la cuenta.
