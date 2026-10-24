# Integración de edición de ventas — estado y pruebas

**Estado:** borrador de Pull Request #1. No fusionar ni desplegar todavía.

## Cambios del frontend
- Preserva id_detalle de las líneas históricas.
- Utiliza identidad independiente por línea.
- Calcula disponibilidad por SKU considerando la venta original.
- Corrige el mensaje al editar una venta.

## Pendientes obligatorios
1. Implementar y validar una RPC editar_venta que actualice detalles existentes por id_detalle sin perder los costos históricos.
2. Validar el trigger financiero V3 en laboratorio, junto con la RPC, antes de instalarlo.
3. Probar stock insuficiente, dos líneas del mismo SKU, ID ajeno o repetido, SKU inexistente, precio/cantidad inválidos y rollback completo.
4. Verificar permisos por rol, movimientos de inventario, anulación y totales financieros.
5. Revisar compatibilidad entre RPC y frontend y realizar despliegue coordinado con respaldo previo.

## Precaución
La RPC actual elimina y recrea detalles. El frontend del PR #1 no debe fusionarse hasta que exista la nueva RPC compatible. No ejecutar SQL candidato en producción.
