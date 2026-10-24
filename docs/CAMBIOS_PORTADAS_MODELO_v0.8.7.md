# Cambios de portadas por modelo y claridad móvil — v0.8.7


## Compatibilidad con v0.9.4 — Catálogo PDF

La versión 0.9.4 incorpora la generación del catálogo PDF desde **Configuración → Identidad y precios**. Esta funcionalidad es del panel administrativo, reutiliza los datos existentes de `productos_publicos` y **no requiere cambios de base de datos**. El PDF se genera localmente en el navegador.

## Fecha
2026-08-03

## Objetivo
Corregir tres puntos de experiencia de usuario: evitar que “Piezas” se interprete como stock, permitir elegir la portada entre imágenes ya cargadas y recuperar el acceso **Ver catálogo** en el panel administrativo móvil.

## Archivos modificados
- `js/catalog.js`
- `js/admin-panel.js`
- `js/admin-template.js`
- `dmmpadmin/index.html`
- `css/styles.css`
- `README.md`
- `docs/CHANGELOG.md`
- `VERSION`

## Claridad de la composición
En el catálogo público la etiqueta:

`Piezas: 4`

fue reemplazada por:

`Incluye: 4 artículos`

El cambio es únicamente visual. El campo de base de datos continúa llamándose `piezas` y el panel administrativo conserva su significado interno.

## Selección de portada
El panel reúne las imágenes de todas las presentaciones que comparten el mismo `codigo_modelo`. El administrador puede escoger cualquiera como portada sin volver a subirla.

La selección:
1. actualiza la vista previa inmediatamente;
2. marca la fotografía elegida con una estrella;
3. guarda la URL en `imagen_portada`;
4. sincroniza esa URL en todas las presentaciones del mismo modelo.

También continúa disponible la carga de una nueva portada, útil para fotografías donde aparecen juntas todas las variantes.

## Prioridad de portada
1. Portada elegida explícitamente para el modelo.
2. Primera fotografía disponible de las presentaciones como respaldo cuando no existe una portada definida.

La portada es una vista general y no representa por sí sola una presentación comprable.

## Acceso móvil al catálogo
El enlace **Ver catálogo** ya no se oculta en pantallas pequeñas. En celular aparece como un botón compacto con icono para no saturar la cabecera, mientras que en escritorio conserva el texto completo.

## Base de datos
No se necesita ejecutar SQL adicional. Se reutilizan las columnas creadas en versiones anteriores.

## Pruebas técnicas realizadas
- Validación de sintaxis de `js/admin-panel.js` con `node --check`.
- Validación de sintaxis de `js/catalog.js` con `node --check`.
- Verificación de actualización sincronizada de `imagen_portada` por `codigo_modelo` en la lógica de guardado.

## Reversión
Para volver a v0.8.6, restaurar los archivos modificados desde el ZIP anterior. No se requiere revertir cambios de base de datos.
