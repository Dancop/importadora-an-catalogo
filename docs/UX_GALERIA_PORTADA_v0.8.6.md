# v0.8.6 — Galería móvil y portada por modelo


## Compatibilidad con v0.9.4 — Catálogo PDF

La versión 0.9.4 incorpora la generación del catálogo PDF desde **Configuración → Identidad y precios**. Esta funcionalidad es del panel administrativo, reutiliza los datos existentes de `productos_publicos` y **no requiere cambios de base de datos**. El PDF se genera localmente en el navegador.

## Fecha
2026-08-03

## Objetivo
Dar prioridad a la experiencia móvil y permitir que el cliente comprenda en el primer pantallazo qué presentaciones existen, cuál está seleccionada, su precio y sus características principales.

## Cambios realizados

### Imagen de portada
- Se agregó el campo `imagen_portada` a `productos_publicos`.
- La portada representa al modelo completo y puede mostrar todas sus presentaciones juntas.
- Desde el panel se puede subir una portada en la sección **Fotografías**.
- Al guardar, la misma URL se aplica a todas las filas que comparten `codigo_modelo`.

### Galería pública
- La portada aparece como primera miniatura cuando está configurada.
- Las demás miniaturas representan cada presentación y muestran el nombre corto del color sobre la imagen.
- Tocar una miniatura de presentación actualiza inmediatamente precio, SKU, disponibilidad, colores, características y WhatsApp.
- Tocar la portada conserva la presentación seleccionada, pero vuelve a mostrar la imagen general.
- Se agregaron flechas y gesto de deslizamiento horizontal en móvil.

### Primer pantallazo móvil
Sin desplazarse demasiado, el cliente ve:
1. Imagen grande.
2. Miniaturas compactas.
3. Nombre del producto.
4. Precio, cuando está habilitado.
5. Presentación seleccionada.
6. Exterior, interior y cantidad de piezas.
7. Botón fijo de WhatsApp.

### Precios ocultos
- El bloque de precio desaparece por completo.
- No se reserva espacio vacío ni se introduce un texto largo en su lugar.
- El botón de WhatsApp continúa fijo en móvil.

### Escritorio
- Se mantiene la distribución en dos columnas.
- La galería permanece a la izquierda.
- La información de la derecha tiene desplazamiento independiente.

## Archivos modificados
- `js/catalog.js`
- `js/admin-panel.js`
- `css/styles.css`
- `README.md`
- `docs/CHANGELOG.md`
- `VERSION`

## Archivo SQL
- `docs/04_portadas_modelo_v0.8.6.sql`

## Reversión
Para volver a v0.8.5, restaurar los archivos anteriores. La columna `imagen_portada` puede permanecer en Supabase sin afectar versiones previas.
