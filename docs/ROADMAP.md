# ROADMAP — Importadora A&N

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
