# CHANGELOG

## 0.9.0 — 2026-09-12

### Added
- Editor enriquecido para las descripciones de productos.
- Soporte para formato HTML seguro en las descripciones.
- Negrita, cursiva, subrayado, listas con viñetas y listas numeradas.

### Changed
- Rediseño del formulario de edición para mejorar la experiencia en escritorio.
- Las áreas de descripción ahora utilizan el ancho disponible.
- Las categorías visibles `Dama` y `Caballero` se presentan como `Mujer` y `Hombre`.
- Se mantiene compatibilidad con productos existentes que todavía tengan los valores históricos de categoría.
- La sanitización limita el HTML de las descripciones a elementos de formato permitidos.
- No se requiere un nuevo script SQL.

Autor: Codex + Daniel

## 0.8.7 — Portadas por modelo y claridad móvil (2026-08-03)

### Catálogo público
- Se cambió la etiqueta ambigua **“Piezas”** por **“Incluye X artículos”**, evitando que el cliente la confunda con la cantidad disponible en stock.
- El stock público continúa expresándose únicamente mediante estados como **Disponible** o **Agotado**.

### Portada del modelo
- La portada se administra como una imagen compartida por todas las presentaciones con el mismo `codigo_modelo`.
- Ahora puede elegirse una portada entre las fotografías ya cargadas de cualquiera de las presentaciones del modelo.
- Se conserva la opción de subir una portada nueva cuando se necesita una composición general con todas las variantes.
- La imagen elegida se marca visualmente con una estrella y se guarda para todo el modelo.
- La prioridad es: portada seleccionada explícitamente; si no existe, primera imagen disponible del grupo como respaldo visual.

### Panel administrativo móvil
- El acceso **Ver catálogo** vuelve a estar visible en celulares como un botón compacto con icono.
- El botón abre el catálogo público en una pestaña nueva y convive con el botón **Salir** sin desarmar la cabecera.

### Base de datos
- No se requieren nuevas columnas ni un nuevo script SQL respecto de v0.8.6.
- Se reutiliza `imagen_portada` y el guardado sincroniza el valor entre registros del mismo `codigo_modelo`.


## 0.8.6 — Galería móvil y portada por modelo

- Se incorporó una imagen de portada compartida por `codigo_modelo`.
- El panel permite subir una portada general desde la sección Fotografías.
- Se rediseñó el modal móvil con miniaturas pequeñas estilo marketplace.
- El nombre corto de la presentación aparece sobre cada miniatura.
- Al elegir una presentación se actualizan precio, SKU, disponibilidad, colores, características y WhatsApp.
- Se agregaron navegación con flechas y gesto de deslizamiento.
- Se compactó el primer pantallazo móvil para reducir el desplazamiento inicial.
- Se mantuvo el diseño estable cuando los precios están ocultos.
- Se añadió `docs/04_portadas_modelo_v0.8.6.sql`.

## 0.8.5 — 2026-08-03

- Se rediseñó el selector de presentaciones con miniaturas y desplazamiento horizontal.
- Se añadieron flechas de navegación y actualización inmediata de fotografía y datos.
- Se priorizó la experiencia móvil con modal a pantalla completa y WhatsApp fijo.
- En escritorio, la columna derecha ahora tiene desplazamiento independiente.
- Se corrigió el diseño cuando `mostrar_precios` está desactivado.
- El catálogo ya no coloca “Consultar por WhatsApp” dentro del espacio del precio.
- No se requiere un nuevo script SQL.

Autor: Codex + Daniel

## 0.8.4 — 2026-08-03

- Se incorporaron presentaciones con color exterior e interior.
- Se añadieron selector visual, hexadecimal y toma de color desde la fotografía.
- El catálogo agrupa variantes de forma segura y muestra hasta cuatro combinaciones.
- La selección actualiza imagen, detalle, SKU, precio y mensaje de WhatsApp.
- Los valores surtidos usan una muestra multicolor y ya no se inventa un círculo gris.
- Se reforzó el manejo de errores para evitar una carga indefinida.
- Se añadió `03_colores_presentaciones_v0.8.4.sql`.

Autor: Codex + Daniel

## 0.8.3 — 2026-07-30

- El Dashboard muestra **Nuestra ganancia** acumulada junto a **Proveedor pendiente**, conservando una cuadrícula simétrica de cuatro tarjetas.
- La tarjeta de ganancia diaria fue sustituida por la ganancia acumulada del negocio para comparar cifras equivalentes.
- Se rediseñó la identidad del usuario en la cabecera con avatar por inicial, nombre y rol separados.
- Se actualizaron versión y documentación.

## 0.8.1 - 2026-07-29

Autor: Codex + Daniel

- Se eliminó la etiqueta “Precio acordado” al editar el precio de venta.
- Se añadió una fecha de venta editable, con la fecha actual como valor inicial.
- Los datos de la venta se limpian inmediatamente después de registrarla.
- “Ver historial” abre una vista independiente del historial.
- La búsqueda de productos se presenta como sección plegable en pantallas pequeñas.
- Se mantuvo el diseño de dos paneles en escritorio: productos y venta actual.


## 0.7.4 — 2026-07-29

### Interfaz móvil
- Se reemplazó **Más** por **Menú** en la navegación inferior.
- El menú móvil queda limitado a cuatro accesos: Inicio, Productos, Ventas y Menú.
- Se corrigió el conflicto de especificidad CSS que ocultaba el cuarto botón en algunos celulares.
- El botón Menú ahora abre un panel inferior con Inventario, Finanzas, Usuarios, Configuración y WhatsApp.
- Se ocultó el botón Menú en escritorio porque la barra lateral ya muestra todas las opciones.
- Se añadieron atributos de accesibilidad `aria-expanded`, `aria-haspopup` y `aria-controls`.

**Autor:** Codex + Daniel

## v0.7.1 — 2026-07-28

### Correcciones
- Se reforzó el Dashboard para que una consulta fallida no deje el panel bloqueado en estado de carga.
- Se reemplazó “Stock bajo” por “Más vendidos”.
- Se corrigieron las proporciones de las fichas de inventario en escritorio.
- Se evitó que precios y métricas se superpongan con la fotografía y el nombre del producto.
- Se centraron los textos debajo de los iconos en la navegación inferior móvil.

### Archivos modificados
- `js/modules/dashboard.js`
- `js/admin-template.js`
- `css/styles.css`
- `VERSION`

### Autor
Codex + Daniel

## 2026-07-28

### Seguridad
✔ Separación del panel administrativo.
✔ Singleton de Supabase.
✔ Roles administrador/editor/solo lectura.

### Base de datos
✔ Módulo de ventas.
✔ Liquidaciones proveedor.
✔ Movimientos de inventario.

### Frontend
✔ Inicio del rediseño del panel.

## 2026-07-28 — v0.7.0

### Panel administrativo
- [x] Nuevo menú principal con Inicio, Productos, Ventas, Inventario, Finanzas, Usuarios, Configuración y WhatsApp.
- [x] Navegación lateral fija en escritorio.
- [x] Navegación inferior simplificada en celular.
- [x] Dashboard inicial conectado a Supabase.
- [x] Tarjetas de ventas, ingresos, ganancia y saldo pendiente del proveedor.
- [x] Listado de productos con stock bajo.
- [x] Listado de ventas recientes.
- [x] Se conservaron las funciones existentes de productos, rentabilidad, catálogo y WhatsApp.

### Código
- [x] Creado `js/modules/dashboard.js`.
- [x] Actualizado `js/admin-template.js` con estructura adaptable.
- [x] Actualizado `js/admin-panel.js` con navegación por módulos.
- [x] Actualizado `css/styles.css` para móvil y escritorio.
- [x] Encabezados de autor establecidos como `Codex + Daniel`.

### Pendiente inmediato
- [ ] Implementar formulario funcional de Nueva venta.
- [ ] Implementar historial y anulación de ventas.
- [ ] Implementar liquidaciones del proveedor.

## 0.7.2 — 2026-07-28

### Correcciones críticas
- El Dashboard abre antes de cargar el inventario; una consulta lenta ya no bloquea toda la aplicación.
- Las consultas iniciales tienen límite de espera y muestran una opción visible para reintentar.
- Las consultas del Dashboard también tienen límite de espera independiente.
- La navegación móvil usa cuatro accesos principales y un botón **Más**.
- Usuarios, Configuración y WhatsApp se abren desde una hoja móvil, evitando desbordes y botones inaccesibles.
- Se añadió soporte para el área segura inferior del teléfono.

Autor: Codex + Daniel.

## 0.7.3 — 2026-07-28

### Estabilidad crítica del panel móvil
- Se restauró el panel administrativo como HTML estático protegido con `hidden`.
- Se eliminó la inyección del panel y la importación dinámica de `admin-panel.js`.
- Se añadieron tiempos máximos para sesión, autenticación y validación del rol.
- Se añadió una pantalla visible de recuperación con **Reintentar** y **Cerrar sesión**.
- Productos e inventario ya no se cargan durante el arranque; se consultan al abrir sus módulos.
- La navegación móvil quedó reducida a Inicio, Productos, Ventas y Más.
- Inventario, Finanzas, Usuarios, Configuración y WhatsApp se muestran dentro de Más.

**Autor:** Codex + Daniel

## v0.8.0 — 2026-07-29

### Módulo de Ventas
- Se reemplazó la pantalla provisional por un registro de ventas funcional.
- Selección rápida mediante precio minorista o mayorista.
- El precio vendido puede modificarse para registrar exactamente lo acordado con el cliente.
- No se muestran alertas ni bloqueos por rentabilidad durante la venta.
- Resumen en vivo de Total venta, Proveedor y Ganancia.
- Cantidad editable respetando el stock disponible.
- Datos opcionales de cliente, teléfono, método de pago y observación.
- Registro mediante la función segura `registrar_venta()`.
- Descuento automático del inventario desde la base de datos.
- Prevención de doble envío mientras la operación está en curso.
- Confirmación final y acceso al historial.
- Historial básico de las últimas 50 ventas.

### Decisiones de negocio
- Toda referencia familiar fue sustituida por el término profesional `Proveedor`.
- El análisis o alerta de rentabilidad baja no pertenece al flujo de Ventas.
- La revisión de rentabilidad se reserva para Productos/Inventario, antes de negociar con el cliente.

### Archivos principales
- `js/modules/ventas.js`
- `js/admin-panel.js`
- `dmmpadmin/index.html`
- `css/styles.css`

Autor: Codex + Daniel

## 0.8.2 - 2026-07-29
- Se corrigió la separación real entre Nueva venta e Historial.
- El historial ya no permanece visible debajo del formulario.
- Se añadió detalle de venta al seleccionar una operación.
- Se añadió edición transaccional de fecha, cliente, pago, observación, productos, cantidades y precios.
- Se añadió anulación desde el detalle de venta.
- Se conserva el historial de movimientos de inventario al editar.
- Se incorporó `02_edicion_ventas_v0.8.2.sql` para actualizar Supabase.
