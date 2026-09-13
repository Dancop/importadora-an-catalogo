# Importadora A&N

Sistema web para catálogo, productos, inventario, ventas, finanzas, usuarios y configuración.

## Versión

**0.9.0**

## v0.9.0 — Editor enriquecido y mejor UX

- Editor enriquecido para `Descripción general` y `Contenido de esta presentación`.
- Permite negrita, cursiva, subrayado, listas con viñetas y listas numeradas.
- El HTML permitido se sanitiza antes de guardarse y al renderizarse en el catálogo público.
- Las descripciones existentes en texto plano siguen siendo compatibles.
- En escritorio, el formulario de edición ya no mantiene la información secundaria en una columna estrecha; las secciones se reorganizan debajo y las descripciones aprovechan el ancho disponible.
- En móvil se conserva una sola columna y la barra de herramientas se adapta al espacio disponible.
- Las categorías visibles `Dama` y `Caballero` se presentan como `Mujer` y `Hombre`; los registros históricos siguen siendo compatibles.
- **No requiere SQL adicional.**

## Actualización de Supabase

No hay migraciones nuevas para v0.9.0. Deben estar aplicadas las migraciones anteriores requeridas por el proyecto:

1. `docs/02_edicion_ventas_v0.8.2.sql`
2. `docs/03_colores_presentaciones_v0.8.4.sql`
3. `docs/04_portadas_modelo_v0.8.6.sql`

## Documentación

- `docs/ARQUITECTURA.md` — estructura y decisiones técnicas.
- `docs/CHANGELOG.md` — historial de cambios.
- `docs/CAMBIOS_EDITOR_RICH_v0.9.0.md` — editor enriquecido, sanitización y UX.
- `docs/CAMBIOS_PORTADAS_MODELO_v0.8.7.md` — cambios de portada por modelo.
- `docs/UX_GALERIA_PORTADA_v0.8.6.md` — galería y experiencia móvil.

## Historial reciente

### v0.8.7 — Portadas por modelo y claridad móvil

- El catálogo público muestra **“Incluye X artículos”** en lugar de “Piezas”.
- La portada puede seleccionarse desde las fotografías ya subidas de todas las presentaciones que comparten el mismo `codigo_modelo`.
- También se mantiene la posibilidad de subir una portada nueva.
- La portada seleccionada se comparte entre las variantes del modelo y tiene prioridad sobre la imagen automática de respaldo.
- En el panel administrativo móvil vuelve a estar visible el acceso directo al catálogo público.
- No requiere SQL adicional si la actualización de v0.8.6 ya fue aplicada.

### v0.8.6 — Galería móvil y portada por modelo

- Portada independiente para cada modelo.
- Miniaturas compactas con el nombre del color.
- Selección de presentación con actualización de imagen, precio, SKU, disponibilidad, características y WhatsApp.
- Diseño móvil tipo marketplace con flechas y deslizamiento.
- El precio oculto no deja espacios vacíos en el diseño.
- Requiere `docs/04_portadas_modelo_v0.8.6.sql`.

### v0.8.5 — Experiencia móvil y selector visual de presentaciones

- Selector de presentaciones con miniaturas y desplazamiento horizontal.
- Flechas de navegación y actualización inmediata de fotografía y datos.
- Modal móvil optimizado y WhatsApp accesible.
- Columna derecha con desplazamiento independiente en escritorio.
- Correcciones para el estado `mostrar_precios` desactivado.

### v0.8.4 — Presentaciones y selector de colores

- Agrupación segura de variantes por `codigo_modelo`.
- Presentaciones con color exterior e interior.
- Selector visual, hexadecimal y toma de color desde la fotografía.
- Actualización de imagen, detalle, SKU, precio y WhatsApp.
- Requiere `docs/03_colores_presentaciones_v0.8.4.sql`.

## Autor

Codex + Daniel
