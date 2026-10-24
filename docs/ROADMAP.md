## v0.10.0 — Inventario consolidado por grupos

- [x] Definir Stock 1, Stock 2 mínimo y stock ficticio para la reconstrucción histórica.
- [x] Crear estructura de grupos/ciudades.
- [x] Crear stock físico por grupo.
- [x] Crear movimientos de inventario de la nueva capa.
- [x] Crear transferencias entre grupos con estado `en_transito` y confirmación de recepción.
- [x] Añadir propietario del producto y grupo vendedor como campos de migración.
- [x] Primera interfaz de Inventario: consulta por grupo y transferencia.
- [ ] Migrar Stock 1 y ventas históricas al nuevo inventario.
- [ ] Determinar Stock 2 mínimo por SKU.
- [ ] Llevar ajustes/ficticio a cero mediante movimientos documentados.
- [ ] Implementar recepción formal de nuevos lotes.
- [ ] Implementar movimientos/historial con filtros.
- [ ] Implementar liquidaciones entre grupos.

## v0.9.5 — Orden automático del catálogo

- [x] Ordenar modelos públicos por ventas completadas de los últimos 60 días.
- [x] Agrupar ventas por `codigo_modelo`.
- [x] Mantener `orden` como desempate y fallback.
- [x] Evitar exponer cantidades vendidas en la respuesta pública.
- [x] Mantener el catálogo operativo si la RPC falla.

# ROADMAP — Importadora A&N


## Compatibilidad con v0.9.4 — Catálogo PDF

La versión 0.9.4 incorpora la generación del catálogo PDF desde **Configuración → Identidad y precios**. Esta funcionalidad es del panel administrativo, reutiliza los datos existentes de `productos_publicos` y **no requiere cambios de base de datos**. El PDF se genera localmente en el navegador.

## Versión 0.7 — Panel administrativo

- [x] Estructura general del panel.
- [x] Dashboard inicial.
- [x] Navegación adaptable para celular y escritorio.
- [x] Módulo de productos integrado.
- [x] Vista de inventario y rentabilidad integrada.
- [ ] Nueva venta funcional.
- [ ] Historial y anulación de ventas.
- [ ] Finanzas y liquidaciones.
- [ ] Gestión de usuarios.

## Versión 0.8 — Operación comercial

- [ ] Reportes PDF.
- [ ] Exportar a Excel.
- [ ] Estadísticas por periodo.
- [ ] Productos más vendidos.
- [ ] Alertas configurables de stock bajo.

## Principios de UX

- Móvil primero para tareas cotidianas.
- Escritorio debe aprovechar columnas y paneles simultáneos.
- Máximo dos o tres acciones principales por pantalla.
- Botones grandes y etiquetas claras.
- Evitar tablas anchas en celular.

- [x] Corregir bloqueo visual del Dashboard y manejo de errores (v0.7.1).
- [x] Sustituir indicador de stock bajo por ranking de productos más vendidos (v0.7.1).
- [x] Ajustar fichas de inventario para escritorio y navegación inferior móvil (v0.7.1).

### Estabilidad previa al módulo Ventas
- [x] Desacoplar carga del inventario del arranque del Dashboard.
- [x] Añadir límites de espera y reintento.
- [x] Corregir navegación inferior móvil mediante menú Más.
- [ ] Validar v0.7.2 en celular y escritorio antes de implementar Nueva venta.

### Estabilización previa a Ventas
- [x] Restaurar panel estático con `hidden`.
- [x] Eliminar carga dinámica del panel.
- [x] Añadir recuperación visible ante errores de inicio.
- [x] Corregir acceso móvil al botón Más.
- [ ] Validar v0.7.3 en celular y escritorio antes de iniciar Nueva venta.

- [x] Congelar navegación principal: cuatro accesos móviles y barra lateral completa en escritorio (v0.7.4).

## v0.8 — Ventas
- [x] Selección de productos con precio minorista o mayorista.
- [x] Precio de venta real editable.
- [x] Cálculo en vivo de Total, Proveedor y Ganancia.
- [x] Registro seguro y descuento automático de stock.
- [x] Confirmación de venta.
- [x] Historial básico de ventas.
- [ ] Detalle completo de una venta desde el historial.
- [ ] Anulación controlada de ventas.
- [ ] Comprobante para compartir.
- [ ] Filtros por fecha, cliente y estado.

## Inventario y precios
- [ ] Diseñar análisis de rentabilidad en Productos/Inventario.
- [ ] Definir indicadores útiles sin interferir con el registro de ventas.

- [x] Mejorar UX del flujo posterior al registro y fecha editable (v0.8.1).

### Completado en v0.8.2
- Separación real de Nueva venta e Historial.
- Detalle, edición y anulación de ventas.

### Próximos pasos de Ventas
- Compartir comprobante.
- Agrupar historial por día.
- Filtros por fecha, cliente, estado y método de pago.

## Estado al cerrar v0.8.3

- [x] Mostrar ganancia acumulada del negocio en Inicio.
- [x] Mantener simetría entre la tarjeta de ganancia y Proveedor pendiente.
- [x] Mejorar la identidad visual del usuario y su rol en la cabecera.
- [x] Cerrar la primera etapa funcional del módulo Ventas.
- [ ] Siguiente módulo principal: Inventario (movimientos, entradas, ajustes e historial de stock).

## v0.9.4 — Catálogo PDF

- [x] Generador de catálogo PDF desde Configuración.
- [x] Uso de datos y fotografías actuales de `productos_publicos`.
- [x] Opciones de contenido y precios independientes de la visibilidad de precios del catálogo web.
- [x] Generación local sin almacenamiento adicional en Supabase.
