# Cambios de presentaciones y colores del catálogo


## Compatibilidad con v0.9.4 — Catálogo PDF

La versión 0.9.4 incorpora la generación del catálogo PDF desde **Configuración → Identidad y precios**. Esta funcionalidad es del panel administrativo, reutiliza los datos existentes de `productos_publicos` y **no requiere cambios de base de datos**. El PDF se genera localmente en el navegador.

## Versión
v0.8.4

## Fecha
2026-08-03

## Objetivo
Evitar que el cliente interprete la fotografía principal como el único color disponible. Cada modelo agrupa sus variantes y muestra de forma clara el color exterior, el color interior y la descripción particular de cada presentación.

## Archivos modificados
- `js/catalog.js`
- `js/admin-panel.js`
- `js/admin-auth.js`
- `css/styles.css`
- `index.html`
- `dmmpadmin/index.html`
- `README.md`
- `VERSION`
- `docs/CHANGELOG.md`

## Archivo agregado
- `docs/03_colores_presentaciones_v0.8.4.sql`

## Base de datos
Se agregan dos columnas opcionales a `productos_publicos`:

- `color_exterior_hex`
- `color_interior_hex`

Ambas aceptan valores hexadecimales con formato `#RRGGBB`. El SQL también propone colores iniciales para los nombres ya existentes. Es necesario ejecutar `docs/03_colores_presentaciones_v0.8.4.sql` antes de guardar colores desde el panel.

## Panel administrativo
Cada variante permite editar:

- nombre del color exterior;
- hexadecimal del exterior;
- nombre del color interior;
- hexadecimal del interior;
- selector visual de color;
- botón **Tomar de la imagen**.

El botón usa la API `EyeDropper` del navegador. Cuando el navegador no la soporta se oculta automáticamente y continúan disponibles la paleta y el campo hexadecimal.

El administrador puede tomar una muestra de cualquier punto visible de la fotografía y luego corregir el hexadecimal manualmente.

## Catálogo público
- Los registros con el mismo `codigo_modelo` se muestran como un producto con varias presentaciones.
- Si `codigo_modelo` está vacío, se utiliza SKU o ID para evitar agrupaciones incorrectas.
- La tarjeta muestra cuántas presentaciones existen.
- Se muestran hasta cuatro combinaciones de exterior/interior.
- El botón cambia a **Elegir presentación** cuando existen varias variantes.
- La ficha presenta por separado **Exterior** e **Interior**.
- La descripción particular cambia con la variante seleccionada.
- Las variantes agotadas quedan deshabilitadas.
- WhatsApp conserva la presentación y SKU seleccionados.

## Colores desconocidos o surtidos
El catálogo ya no inventa un círculo gris:

- si existe hexadecimal, muestra el tono configurado;
- si el texto indica “surtido”, “variado” o “multicolor”, muestra una muestra multicolor;
- si no existe hexadecimal, muestra únicamente el nombre del color.

## Carga y errores
La carga pública usa `try/catch`. Si Supabase responde con error, el indicador de carga se reemplaza por un mensaje y el detalle completo se registra en la consola.

## Compatibilidad
La selección desde imagen depende de `EyeDropper`, disponible principalmente en navegadores Chromium y en contextos seguros HTTPS. GitHub Pages cumple el requisito HTTPS. La paleta y el hexadecimal funcionan aunque `EyeDropper` no esté disponible.

## Pruebas realizadas
- Validación sintáctica de `catalog.js`, `admin-panel.js` y `admin-auth.js` con Node.js.
- Revisión de agrupación segura cuando falta `codigo_modelo`.
- Revisión de validación de hexadecimal `#RRGGBB`.
- Revisión de variante agotada y selección inicial disponible.
- Revisión del manejo de error de carga para evitar que quede “Cargando productos…”.

## Reversión
Para volver a v0.8.3, restaura los archivos modificados desde el ZIP original. Las columnas nuevas pueden permanecer en Supabase porque son opcionales y no afectan la versión anterior.
