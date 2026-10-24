# Importadora A y N — Plan maestro de implementación y pruebas

**Fecha de consolidación:** 24 de octubre de 2026  
**Estado:** documento de seguimiento; NO es autorización para desplegar ni modificar producción.  
**Alcance:** modelo de costos y ganancias, procedimientos almacenados de ventas, panel administrativo y pruebas seguras.

## 1. Entornos y reglas de seguridad

| Entorno | ID de proyecto | Propósito | Restricción |
|---|---|---|---|
| `importadora-an` | `tomhtmurkycvduruvrvt` | Producción de ventas e inventario | No desplegar migraciones ni cambiar código sin aprobación explícita |
| `control-compras` | `cjvxbbxzcbryptzzsrzx` | Proyecto independiente, potencial entorno auxiliar de pruebas | No borrar ni modificar tablas, datos ni configuraciones; solo se autorizó reactivar, inspeccionar y preparar respaldo |

Repositorio del catálogo: `Dancop/importadora-an-catalogo`.

**Regla:** nunca tratar `control-compras` como un proyecto desechable. No ejecutar pruebas en él antes de respaldo completo, validación de restaurabilidad y autorización nueva y específica.

## 2. Modelo financiero acordado

Todos los productos proceden de un único contenedor.

- `factor_adquisicion = 2.20` para los **22 SKU**.
- `factor_costo = 2.60` para los **22 SKU** (factor del importe del proveedor).
- `costo_adquisicion_unitario = precio_base_historico × 2.20`.
- `costo_adquisicion_total = costo_adquisicion_unitario × cantidad`.
- `costo_proveedor_unitario = precio_base_historico × 2.60`.
- `costo_proveedor_total = costo_proveedor_unitario × cantidad` (columna generada).
- `ganancia_proveedor_total = costo_proveedor_total − costo_adquisicion_total`.
- `ganancia_real = subtotal − costo_proveedor_total − otros_gastos` (columna generada; comprobar nombre exacto de columna de gastos en SQL vigente).
- Redondeo monetario a dos decimales; presentación Bolivia: `Bs. 1.234,50`.

**Verificado en producción:** 22/22 SKU con factor adquisición 2.20 y 22/22 con factor proveedor 2.60; cero pendientes. La última actualización afectó exclusivamente a los nueve SKU que carecían de `factor_adquisicion`.

## 3. Ventas históricas — trabajo completado

Se actualizaron y verificaron **67 líneas de detalle**, **70 unidades**, **13 SKU vendidos**. En el último control, las 67 líneas cumplían las condiciones de factor histórico 2.20 y 2.60 y tenían costos de adquisición y ganancia del proveedor informados.

Cifras históricas consolidadas en la revisión previa:

| Concepto | Bs. |
|---|---:|
| Ingresos por ventas | 7.440,00 |
| Costo de adquisición | 4.026,00 |
| Importe del proveedor | 4.758,00 |
| Ganancia del proveedor | 732,00 |
| Ganancia propia | 2.682,00 |

Son cifras de un corte anterior: volver a comprobarlas antes de un despliegue porque podrían existir ventas posteriores.

Existía respaldo anterior en `public.respaldos_json_manuales`, id 1, creado 2026-10-24 05:31:31+00; **precede a parte de las actualizaciones financieras**. Hacer un respaldo nuevo antes de cualquier despliegue.

## 4. Plan oficial de implementación — cuatro fases

Las cuatro fases siguientes son la estructura oficial acordada. Las tareas internas no constituyen fases adicionales.

### Fase 1 — Integridad de Supabase
**Objetivo:** Preparar la migración SQL, respaldar las definiciones actuales y probar el registro y la edición sin afectar ventas reales.

**Estado:** EN PREPARACIÓN; migración NO ejecutada.

**Tareas y controles:**
1. Conservar las definiciones y permisos actuales de `registrar_venta` y `editar_venta`.
2. Revisar los borradores SQL y comprobar que sus firmas, columnas, tipos, restricciones y permisos coincidan con la base vigente.
3. Preparar entorno aislado y datos de prueba. `control-compras` es otro proyecto real: no sobrescribirlo.
4. Inspeccionar y respaldar `control-compras`; comprobar que el respaldo pueda restaurarse antes de autorizar cualquier escritura de prueba.
5. Probar creación y edición de ventas, stock, costos históricos, errores y permisos.
6. Preparar respaldo nuevo de `importadora-an`, plan de reversión y solicitar aprobación específica antes del despliegue.

**Criterio de salida:** pruebas documentadas satisfactorias, respaldo verificable, migración revisada y autorización expresa para producción.

### Fase 2 — Cálculos financieros
**Objetivo:** Corregir las fórmulas del inventario y mostrar los dos márgenes sin confundirlos.

**Estado:** PARCIAL: datos históricos y factores de inventario normalizados; código del panel pendiente.

**Tareas y controles:**
1. Mantener separados costo de adquisición (factor 2.20) e importe del proveedor (factor 2.60).
2. Mostrar ganancia del proveedor = importe del proveedor menos adquisición.
3. Mostrar ganancia propia = ingreso por ventas menos importe del proveedor y otros gastos.
4. Corregir en `js/admin-panel.js` la fórmula que actualmente resta precio base en vez de adquisición.
5. Verificar redondeos, totales por SKU, venta y consolidado.

**Criterio de salida:** fórmulas y resultados conciliados con consultas SQL y casos de prueba.

### Fase 3 — Interfaz administrativa
**Objetivo:** Incorporar los importes en ventas, historial y panel administrativo, con formato `Bs. 1.234,50`.

**Estado:** PENDIENTE.

**Tareas y controles:**
1. Revisar `js/admin-panel.js`, `js/modules/ventas.js`, `js/modules/dashboard.js` y las vistas pertinentes.
2. Incorporar costos y ganancias claramente diferenciados, sin alterar los snapshots calculados por servidor.
3. Mostrar siempre dos decimales, separador de miles y coma decimal en bolivianos.
4. Verificar responsive, visualización, edición y coherencia entre pantallas.

**Criterio de salida:** interfaz revisada y comprobada, sin regresiones.

### Fase 4 — Pruebas y publicación
**Objetivo:** Verificar los 67 registros históricos, probar operaciones nuevas y publicar mediante cambios revisables en GitHub.

**Estado:** PENDIENTE.

**Tareas y controles:**
1. Revalidar las 67 líneas históricas (cifra del corte anterior; verificar si hubo ventas nuevas).
2. Probar ventas nuevas, ediciones, anulaciones, movimientos de stock y permisos.
3. Conciliar ingresos, adquisición, importe del proveedor y ganancias.
4. Revisar los cambios de GitHub y publicar únicamente con aprobación expresa.
5. Documentar resultados, fecha, versión, respaldo y procedimiento de reversión.

**Criterio de salida:** pruebas y conciliaciones satisfactorias, publicación aprobada y bitácora actualizada.

### Avances previos que no cambian la numeración
- Diagnóstico de funciones SQL y frontend: realizado.
- Inventario: 22/22 SKU con ambos factores: realizado.
- Detalles históricos: 67/67 líneas normalizadas en el corte revisado: realizado.
- SQL de migración, preflight y validación: **borradores preparados, sin pruebas de ejecución**.
- `control-compras`: reactivación solicitada y aceptada; última comprobación registrada `COMING_UP`, sin respaldo SQL validado.
- GitHub: se intentó crear documentación, pero la integración respondió `403`; ningún archivo se subió mediante ChatGPT. El usuario optó por carga manual.

## 5. Riesgos y decisiones pendientes

1. Verificar si `control-compras` permite un respaldo/restauración completos y si puede alojar pruebas aisladas sin interferir con su uso real.
2. Confirmar que el procedimiento de respaldo preserve esquema, datos, políticas, roles, funciones y dependencias; separar lo que queda fuera de SQL.
3. Revisar borradores SQL por seguridad, consistencia de redondeos y manejo de snapshots.
4. Definir y ensayar rollback; un `BEGIN/ROLLBACK` en producción no sustituye un entorno aislado.
5. Obtener autorizaciones separadas para pruebas con escritura, despliegue a producción y cambios de GitHub.

## 6. Bitácora de decisiones y estado

- **Aprobado y ejecutado:** asignar factor adquisición 2.20 a los nueve SKU pendientes de `importadora-an`; verificado 22/22.
- **Aprobado solo como preparación:** redactar migración SQL y consultas de control; no desplegar.
- **Aprobado y ejecutado:** solicitud de reactivación de `control-compras` para inspección/respaldo; estado `COMING_UP` en última consulta.
- **No autorizado:** borrar o sobrescribir información de `control-compras`; ejecutar migración de ventas; cambiar funciones de producción. **Autorizado:** preparar y subir manualmente documentación y borradores a GitHub; no modificar código de aplicación.

## 7. Instrucción para retomar trabajo

Antes de actuar, leer este documento y los tres archivos SQL, comprobar estado actual de Supabase y GitHub, distinguir tareas completadas de pendientes y solicitar autorización para toda modificación fuera del alcance ya aprobado. No interpretar el plan como autorización automática.
