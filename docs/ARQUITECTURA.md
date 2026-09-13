# ARQUITECTURA — Importadora A&N

## Flujo comercial

```text
Productos
   ↓
Inventario
   ↓
Venta
   ↓
Detalle de venta
   ↓
Movimiento de inventario
   ↓
Monto generado para proveedor
   ↓
Liquidación al proveedor
   ↓
Dashboard
```

## Frontend

```text
dmmpadmin/index.html
        ↓
js/admin-auth.js
        ↓
js/admin-template.js
        ↓
js/admin-panel.js
        ↓
js/modules/dashboard.js
```

### Responsabilidades

- `admin-auth.js`: sesión, autorización y carga del panel.
- `admin-template.js`: estructura visual del panel.
- `admin-panel.js`: productos, configuración, WhatsApp, navegación y permisos visuales.
- `modules/dashboard.js`: resumen financiero, stock bajo y ventas recientes.
- `supabase-client.js`: única instancia compartida de Supabase.

## Base de datos

Tablas principales:

- `productos_publicos`
- `inventario_privado`
- `administradores`
- `ventas`
- `detalle_ventas`
- `movimientos_inventario`
- `liquidaciones_proveedor`

Funciones principales:

- `registrar_venta`
- `anular_venta`
- `registrar_liquidacion_proveedor`
- `anular_liquidacion_proveedor`
- `obtener_resumen_financiero`

## Decisiones importantes

- Cada detalle de venta guarda precio base y factor de costo históricos.
- Las ventas no se eliminan: se anulan.
- Una anulación devuelve automáticamente el stock.
- Las escrituras sensibles se realizan mediante funciones seguras de Supabase.
- El panel usa un único cliente de Supabase para evitar múltiples sesiones GoTrue.


## Navegación adaptable (v0.7.4)

- **Escritorio:** barra lateral completa con todos los módulos; no se muestra un botón adicional de menú.
- **Móvil:** barra inferior fija con Inicio, Productos, Ventas y Menú.
- **Menú móvil:** panel inferior con Inventario, Finanzas, Usuarios, Configuración y WhatsApp.
- El contenido administrativo continúa presente en el HTML y oculto con `hidden` hasta validar sesión y rol.

## Módulo de Ventas — v0.8.0

El módulo se implementa en `js/modules/ventas.js` y se inicializa desde `admin-panel.js`.

Flujo:

1. El usuario abre Ventas.
2. El módulo carga `productos_publicos` e `inventario_privado` únicamente al abrirse.
3. El usuario elige precio minorista o mayorista como referencia.
4. Puede modificar `precio_venta_unitario` para registrar el precio realmente acordado.
5. La interfaz calcula una vista previa de Total, Proveedor y Ganancia.
6. El registro definitivo se ejecuta mediante `registrar_venta()`.
7. La función de base de datos guarda la fotografía histórica de precios y costo, descuenta stock y crea el movimiento de inventario dentro de una sola transacción.
8. El frontend invalida su caché local de productos y actualiza el Dashboard.

### Regla de responsabilidad

Ventas registra una negociación ya acordada y no muestra alertas de rentabilidad. El análisis de precios se mantiene separado en Productos/Inventario.


## Ventas v0.8.1
La fecha comercial se captura desde el formulario y se envía a `registrar_venta()`. Al finalizar, el estado temporal del formulario se reinicia antes de presentar las acciones posteriores. Nueva venta e historial son vistas independientes.

## Edición de ventas (v0.8.2)
La edición se realiza exclusivamente mediante la RPC `editar_venta()`. La función devuelve temporalmente el stock de la venta original, reemplaza los detalles, valida el stock disponible y vuelve a descontarlo dentro de una única transacción. No se deben editar directamente las tablas desde JavaScript.

## Dashboard y cabecera — v0.8.3

- El resumen diario y el resumen acumulado se obtienen mediante dos llamadas a `obtener_resumen_financiero()`.
- `Nuestra ganancia` usa `ganancia_real` sin filtro de fechas y excluye ventas anuladas por la propia función SQL.
- `Proveedor pendiente` conserva el saldo acumulado calculado por la función.
- La cabecera representa la identidad del usuario como información, no como botón: inicial, nombre y rol.

## v0.9.0 — Contenido enriquecido y galerías por presentación

- `productos_publicos.imagenes` continúa almacenando las fotografías específicas de cada SKU/presentación.
- `productos_publicos.imagen_portada` representa la portada compartida del modelo (`codigo_modelo`).
- El catálogo agrupa las variantes por `codigo_modelo` y, al seleccionar una presentación, utiliza todas las imágenes de `imagenes` de ese SKU para la galería.
- `descripcion` y `detalle_distintivo` pueden almacenar HTML limitado a etiquetas de formato seguro (`strong`, `b`, `em`, `i`, `u`, `s`, `p`, `br`, `ul`, `ol`, `li`).
- El panel administrativo sanitiza el HTML antes de guardarlo; el catálogo vuelve a sanitizarlo antes de renderizarlo.
- No se requiere una modificación del esquema de Supabase para v0.9.0.
