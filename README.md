# Importadora A&N

Sistema web para catálogo, productos, inventario, ventas, finanzas, usuarios y configuración.

## Versión
0.8.4

## Actualización requerida
Ejecutar en Supabase SQL Editor, en este orden si aún no fueron aplicados:

1. `docs/02_edicion_ventas_v0.8.2.sql`
2. `docs/03_colores_presentaciones_v0.8.4.sql`

## v0.8.4 — Presentaciones y selector de colores

- Agrupa las variantes por `codigo_modelo` sin unir productos que tengan el código vacío.
- Muestra al cliente las presentaciones disponibles con color exterior e interior.
- Permite elegir cada presentación y actualiza fotografías, descripción, SKU, precio y WhatsApp.
- Añade paleta visual y entrada hexadecimal para exterior e interior.
- En navegadores compatibles permite tomar un color directamente de la fotografía con `EyeDropper`.
- Los colores surtidos usan una muestra multicolor y los colores sin hexadecimal ya no generan un círculo gris inventado.
- Refuerza la carga pública para que un error no deje el catálogo detenido en “Cargando productos…”.

Más detalles en `docs/CAMBIOS_PRESENTACIONES_COLORES_v0.8.4.md`.

## Autor
Codex + Daniel
