
## v0.8.6 — Galería móvil y portada por modelo

- Portada independiente para cada modelo, pensada para mostrar todas las presentaciones juntas.
- Miniaturas compactas con el nombre del color sobre la imagen.
- Selección inmediata de presentación: actualiza imagen, precio, SKU, disponibilidad, características y WhatsApp.
- Diseño móvil tipo marketplace, con imagen grande, flechas, deslizamiento y primer pantallazo optimizado.
- El precio se oculta sin dejar espacios ni deformar el diseño cuando `mostrar_precios` está desactivado.
- Requiere ejecutar `docs/04_portadas_modelo_v0.8.6.sql` en Supabase.

Más detalles en `docs/UX_GALERIA_PORTADA_v0.8.6.md`.

# Importadora A&N

Sistema web para catálogo, productos, inventario, ventas, finanzas, usuarios y configuración.

## Versión
0.8.5

## Actualización requerida
Ejecutar en Supabase SQL Editor, en este orden si aún no fueron aplicados:

1. `docs/02_edicion_ventas_v0.8.2.sql`
2. `docs/03_colores_presentaciones_v0.8.4.sql`

**v0.8.5 no requiere un nuevo SQL.**

## v0.8.5 — Experiencia móvil y selector visual de presentaciones

- Prioriza la navegación desde celulares.
- Convierte las presentaciones en un carrusel horizontal con miniaturas.
- Añade flechas para avanzar y retroceder entre presentaciones.
- Al tocar una opción actualiza fotografía, precio, detalle, SKU y WhatsApp.
- En escritorio, la columna de información tiene desplazamiento independiente.
- En celular, el botón de WhatsApp permanece accesible en la parte inferior.
- Corrige la distribución cuando los precios están ocultos.
- Cuando `mostrar_precios` está desactivado, no se reserva espacio para un precio inexistente ni se desarma la tarjeta.

Más detalles en `docs/UX_PRESENTACIONES_v0.8.5.md`.

## v0.8.4 — Presentaciones y selector de colores

- Agrupa las variantes por `codigo_modelo` sin unir productos que tengan el código vacío.
- Muestra al cliente las presentaciones disponibles con color exterior e interior.
- Permite elegir cada presentación y actualiza fotografías, descripción, SKU, precio y WhatsApp.
- Añade paleta visual y entrada hexadecimal para exterior e interior.
- En navegadores compatibles permite tomar un color directamente de la fotografía con `EyeDropper`.
- Los colores surtidos usan una muestra multicolor y los colores sin hexadecimal ya no generan un círculo gris inventado.
- Refuerza la carga pública para que un error no deje el catálogo detenido en “Cargando productos…”.

## Autor
Codex + Daniel

## Novedades de v0.8.7

- El catálogo público muestra **“Incluye X artículos”** en lugar de “Piezas”, para no confundir la composición del set con el stock.
- La portada puede seleccionarse desde las fotografías ya subidas de todas las presentaciones que comparten el mismo `codigo_modelo`.
- También se mantiene la posibilidad de subir una portada nueva cuando se desea una fotografía general del modelo.
- La portada seleccionada se comparte entre todas las variantes del modelo y tiene prioridad sobre la imagen automática de respaldo.
- En el panel administrativo móvil vuelve a estar visible el acceso directo al catálogo público.
- Esta versión no requiere ejecutar SQL adicional si la actualización de v0.8.6 ya fue aplicada.
