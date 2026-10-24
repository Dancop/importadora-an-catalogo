# Validación de edición de ventas — laboratorio (24 octubre 2026)

## Estado
Candidato SQL: `docs/importadora_an_editar_venta_candidato_v1.sql`.
Frontend: `js/modules/ventas.js` en esta rama.
Trigger financiero candidato: `docs/importadora_an_finanzas_trigger_candidato_v3.sql` en `main`.
**NO desplegar a producción ni fusionar sin autorización.**

## Pruebas realizadas en esquema aislado `pruebas_ventas`
- Edición de cantidades de venta 2: conserva IDs 8 y 9 y factores históricos; total Bs 200.
- Ajustes de inventario netos: reloj -1 y billetera +1, sin reversión/reventa total.
- Rechazos: stock insuficiente, ID de otra venta, ID duplicado y SKU inexistente; sin cambios persistentes.
- Alta de línea nueva con SKU ya existente: creó ID 10; total Bs 245; movimiento neto de una unidad.
- Eliminación de ID 10: restauró Bs 200, devolución neta de una unidad.
- Factores históricos: cambio temporal del inventario 2.20/2.60 a 2.30/2.80; línea vieja retuvo históricos y línea nueva tomó valores actuales. Revertido.
- Privilegios de función de laboratorio: `anon` y `authenticated` sin EXECUTE.
- Trigger de actualización de laboratorio en `detalle_financiero_compat`: recalcula importes y rechaza alteración de factores históricos.
- Prueba combinada (tablas de laboratorio separadas): total temporal Bs 295, cálculos correctos y rollback completo.

## Limitaciones y bloqueantes antes de aprobar
1. No se ha ejecutado la función candidata de producción en laboratorio con tablas espejo del esquema real. La función de laboratorio tiene firma y estructura simplificadas.
2. No se ha instalado ni probado literalmente el trigger V3 en una tabla espejo de producción.
3. No hay prueba de concurrencia con sesiones simultáneas ni pruebas autenticadas de la RPC definitiva.
4. Revisar compatibilidad con triggers, constraints y grants de producción; verificar `SECURITY DEFINER` y `search_path`.
5. Revisar regla de `precio_sugerido_unitario` cuando cambia `tipo_precio`: candidato conserva sugerido histórico en líneas existentes.
6. Probar operaciones completas desde el frontend en entorno de ensayo.
7. Crear respaldo reciente y plan de reversión antes de cualquier despliegue autorizado.

## Protección
Producción `tomhtmurkycvduruvrvt`: **solo lecturas**. Pruebas realizadas en esquema `pruebas_ventas` del proyecto `cjvxbbxzcbryptzzsrzx`. Ningún cambio en `main`.
