# UX de presentaciones v0.8.5


## Compatibilidad con v0.9.4 — Catálogo PDF

La versión 0.9.4 incorpora la generación del catálogo PDF desde **Configuración → Identidad y precios**. Esta funcionalidad es del panel administrativo, reutiliza los datos existentes de `productos_publicos` y **no requiere cambios de base de datos**. El PDF se genera localmente en el navegador.

## Fecha
2026-08-03

## Objetivo
Mejorar la selección de presentaciones priorizando el uso desde celulares, sin descuidar la versión de escritorio y sin alterar la configuración de precios del catálogo.

## Problemas corregidos

1. En escritorio, la lista de presentaciones podía quedar fuera del área visible del modal.
2. En celular, las presentaciones parecían información estática y no opciones seleccionables.
3. Al pulsar una presentación no era suficientemente evidente que la fotografía y los datos cambiaban.
4. Cuando `mostrar_precios` estaba desactivado, el texto “Consultar por WhatsApp” ocupaba el espacio reservado al precio y podía desalinear la tarjeta.

## Cambios realizados

### Selector visual de presentaciones
- Se sustituyó la lista vertical por una banda horizontal desplazable.
- Cada presentación incluye miniatura real, combinación exterior/interior y disponibilidad.
- La presentación activa tiene borde destacado y marca de selección.
- Se añadieron flechas anterior/siguiente.
- Al seleccionar una presentación se actualizan inmediatamente fotografía, miniaturas, precio, detalle, SKU y mensaje de WhatsApp.

### Experiencia móvil
- El modal ocupa toda la pantalla.
- La fotografía aparece primero.
- El selector de presentaciones aparece antes de la descripción.
- La banda de presentaciones se puede desplazar con el dedo.
- El botón de WhatsApp permanece fijo en la parte inferior.
- En pantallas muy estrechas se oculta el botón secundario Compartir para priorizar la consulta.

### Experiencia de escritorio
- La galería permanece en la columna izquierda.
- La columna derecha tiene desplazamiento independiente.
- El modal conserva una altura limitada al área visible.
- Las presentaciones se navegan horizontalmente sin alargar indefinidamente el modal.

### Precio oculto
Cuando `configuracion_publica.mostrar_precios` es `false`:
- No se imprime un texto largo en el lugar del precio.
- No se muestra precio dentro de las tarjetas de presentación.
- La tarjeta del catálogo conserva una única llamada a la acción de ancho completo.
- El botón de WhatsApp sigue disponible en el detalle.
- El mensaje compartido utiliza “Consultar por WhatsApp” en el campo de precio, manteniendo la plantilla actual.

Cuando `mostrar_precios` es `true`:
- Se mantiene el precio en la tarjeta general.
- Se muestra el precio de cada presentación.
- El precio seleccionado aparece junto al título en el detalle.

## Archivos modificados
- `js/catalog.js`
- `css/styles.css`
- `README.md`
- `docs/CHANGELOG.md`
- `docs/UX_PRESENTACIONES_v0.8.5.md`
- `VERSION`

## Base de datos
No se requiere un nuevo script SQL para v0.8.5. Se reutilizan los campos incorporados en v0.8.4.

## Validaciones realizadas
- Validación sintáctica de `js/catalog.js` con Node.js.
- Revisión de ambos caminos de renderizado: precios visibles y precios ocultos.
- Verificación de que el texto “Consultar por WhatsApp” ya no ocupa la columna de precio en las tarjetas.
- Verificación de que la selección conserva SKU y presentación en el enlace de WhatsApp.

## Reversión
Para volver al comportamiento anterior, restaurar `js/catalog.js` y `css/styles.css` desde v0.8.4 y cambiar `VERSION` a `0.8.4`.
