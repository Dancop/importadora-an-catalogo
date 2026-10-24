## v0.10.0 — Inventario consolidado por grupos

La nueva capa de inventario es aditiva respecto al modelo legado. No elimina `inventario_privado`, `movimientos_inventario` ni las ventas existentes mientras se completa la conciliación histórica.

Flujo objetivo:

```text
Producto
   ↓
grupo_propietario_id
   ↓
Stock físico por grupo
   ↓
stock_por_grupo
   ↓
movimientos_inventario_grupo
   ↓
Venta / Transferencia / Ajuste
```

Tablas nuevas:

- `grupos`: grupos/ciudades operativas.
- `usuarios_grupo`: relación de usuarios con grupos.
- `stock_por_grupo`: stock físico de cada SKU en cada grupo.
- `movimientos_inventario_grupo`: historial de movimientos de la nueva capa.
- `transferencias`: cabecera de transferencias entre grupos.
- `detalle_transferencias`: productos y cantidades transferidas.

Campos de migración añadidos:

- `productos_publicos.grupo_propietario_id`: grupo propietario/importador del SKU.
- `ventas.grupo_vendedor_id`: grupo que realizó la venta.

Regla de transferencias:

1. El grupo origen registra la transferencia.
2. El stock se descuenta del origen inmediatamente.
3. La transferencia queda `en_transito`.
4. El grupo destino confirma la recepción.
5. Solo entonces aumenta el stock del destino.
6. La propiedad del producto no cambia.

La primera interfaz se encuentra en el panel **Inventario** y permite consultar el stock por grupo y registrar transferencias. La migración histórica y las entradas del nuevo lote se mantienen separadas hasta cerrar la conciliación documentada en `reconstruccion-conciliacion-inventario.md`.

Requiere ejecutar `docs/07_modulo_inventario_consolidado_v0.10.0.sql`.

## v0.9.5 — Orden del catálogo por ventas recientes

El catálogo público mantiene `productos_publicos` como fuente de productos y añade una RPC de solo lectura para obtener el posicionamiento de los modelos según las ventas completadas de los últimos 60 días.

Flujo público:

```text
ventas + detalle_ventas
        ↓
obtener_orden_catalogo_por_ventas()
        ↓
solo codigo_modelo + posicion
        ↓
js/catalog.js
        ↓
orden de groups
        ↓
render del catálogo
```

La agrupación se realiza por `codigo_modelo`, de modo que todas las presentaciones/SKU de un mismo modelo suman para su posicionamiento. Los modelos sin ventas recientes conservan el orden de `productos_publicos.orden`.

La RPC no devuelve las unidades vendidas ni otros datos comerciales. Si la llamada falla, `catalog.js` continúa utilizando el orden existente de `productos_publicos.orden`, evitando que el ranking pueda interrumpir la carga del catálogo.

La función limita `p_dias` al intervalo de 1 a 365 días y utiliza `SECURITY DEFINER` con `search_path` fijo. El acceso de ejecución se concede únicamente a `anon` y `authenticated`.

Requiere ejecutar `docs/05_orden_catalogo_por_ventas_v0.9.5.sql`.

# ARQUITECTURA — Importadora A&N


## Compatibilidad con v0.9.4 — Catálogo PDF

La versión 0.9.4 incorpora la generación del catálogo PDF desde **Configuración → Identidad y precios**. Esta funcionalidad es del panel administrativo, reutiliza los datos existentes de `productos_publicos` y **no requiere cambios de base de datos**. El PDF se genera localmente en el navegador.

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


## v0.9.1 — Visor a pantalla completa y enlaces por presentación

El catálogo mantiene el modelo agrupado por `codigo_modelo`. Al abrir un producto se presenta primero `imagen_portada` sin seleccionar ninguna variante. Las presentaciones se activan explícitamente por el usuario y, desde ese momento, la galería utiliza exclusivamente el arreglo `imagenes` de la presentación seleccionada.

La selección genera un enlace profundo usando el código del modelo y el SKU de la presentación cuando existe (`?producto=...&sku=...`). Si una presentación no tiene SKU, se utiliza su índice como respaldo (`?producto=...&presentacion=...`). Esto permite compartir o abrir directamente una presentación concreta sin duplicar productos en el catálogo.

## v0.9.4 — Generación de catálogo PDF

El panel administrativo incorpora `js/catalog-pdf.js`. El módulo recibe los registros ya cargados de `productos_publicos` y la configuración de `configuracion_publica`, carga las fotografías públicas y genera un PDF A4 directamente en el navegador mediante jsPDF.

No se crea una copia de los productos ni se almacena el PDF en Supabase. Las opciones de salida controlan SKU, descripción, detalle/presentación, precio minorista, disponibilidad y productos agotados.
