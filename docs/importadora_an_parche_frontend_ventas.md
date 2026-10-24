# Parche de integración pendiente — ventas.js

**Estado:** propuesta técnica para revisión. No aplicado a GitHub ni a producción.

## 1. Conservar el ID al cargar una venta

En `beginEditSelectedSale`, dentro del objeto devuelto por `sale.details.map(detail => { ... })`, agregar:

```js
id_detalle: detail.id,
```

## 2. Enviar el ID solo al editar

En `registerSale`, reemplazar la construcción de `payload` por:

```js
const payload = cart.map(item => ({
  ...(editingSaleId && item.id_detalle ? { id_detalle: item.id_detalle } : {}),
  sku: item.sku,
  cantidad: item.cantidad,
  tipo_precio: item.tipo_precio,
  precio_venta_unitario: item.precio_venta,
  otros_gastos: 0
}));
```

## 3. Evitar la pérdida de identidad al añadir el mismo SKU

Actualmente `addProduct` busca una línea por `sku` y actualiza la primera que encuentra. Si existen dos detalles históricos con el mismo SKU, el carrito debe manejar cada línea por una clave propia (por ejemplo `id_detalle` o una clave temporal de interfaz) en `renderCart` y `bindCartItem`. No basta con aplicar los cambios 1 y 2 en ese escenario.

## 4. Requisito SQL

La futura RPC `editar_venta` debe aceptar `id_detalle` como campo opcional del JSON, validar que pertenece a la venta y al SKU, preservar sus costos y factores históricos, y asignar costos actuales únicamente a líneas nuevas. Debe rechazar IDs repetidos o ajenos. Hasta desplegar la RPC compatible, NO desplegar el cambio frontend.

## 5. Pruebas de aceptación

- Editar precio y cantidad manteniendo `id_detalle`.
- Quitar una línea y añadir otra.
- Dos líneas del mismo SKU con factores históricos diferentes.
- Rechazar ID de otra venta, cantidad inválida y stock insuficiente.
- Comprobar reversión completa, movimientos y permisos.
- Validar interfaz y función SQL en el mismo entorno de pruebas.
