# Importadora A y N — Revisión de documentación SQL

**Fecha:** 24/10/2026  
**Alcance:** revisión estática de los tres borradores SQL; **no ejecutados ni validados contra una copia de base de datos**.

## Resultado

- `importadora_an_fase1_migracion_BORRADOR.sql`: **NO APTO PARA PRODUCCIÓN AÚN**. Propone reemplazar `registrar_venta` y `editar_venta`, conserva snapshots de SKU existentes y calcula adquisición/proveedor. Necesita comprobar firmas y columnas exactas, restricciones, tipos, roles y ejecución transaccional en un clon.
- `importadora_an_fase1_preflight_y_respaldo.sql`: **CONSULTAS DE LECTURA, NO RESPALDO COMPLETO**. Recupera definiciones y permisos de las funciones y cifras de control, pero no exporta esquema y datos completos, Auth ni Storage.
- `importadora_an_fase1_validacion_y_pruebas.sql`: **BORRADOR DE CONTROL**. Incluye consultas y escenarios de prueba; falta ejecutarlos en un clon y verificar columnas del esquema real.

## Riesgos y comprobaciones obligatorias

1. La edición revierte movimientos y elimina/reinserta detalles; hay que probar especialmente SKU repetidos, snapshots diferentes, cambios de cantidad, errores intermedios y reversión transaccional.
2. Revisar si los roles con permiso `EXECUTE` tras `CREATE OR REPLACE` son exactamente los esperados. La consulta `proacl` por sí sola no demuestra todos los permisos efectivos: comprobar `has_function_privilege` para `anon` y `authenticated`.
3. Confirmar que la fórmula de `otros_gastos` en los totales coincide con el modelo actual de la base, y que no hay redondeos divergentes.
4. Verificar el comportamiento de valores nulos, tipos de precio y stock insuficiente, incluyendo ventas con varias líneas del mismo SKU.
5. El SQL de preflight no genera un archivo `.sql` de respaldo: se requiere una exportación real y comprobación de restauración.
6. Confirmar los nombres y existencia de las columnas utilizadas por la consulta de validación (`ventas.numero`, totales y columnas de `detalle_ventas`).
7. No probar en `control-compras` hasta inspeccionar y respaldar ese proyecto y recibir autorización específica para crear un espacio aislado.

## Autorizaciones

- Autorizado: documentación y subida manual a GitHub.
- No autorizado: ejecutar migraciones, modificar código del catálogo, alterar datos de `control-compras` o producción.

## Estado para la próxima sesión

Continuar con inspección de `control-compras`, respaldo real verificable y preparación de pruebas aisladas. Solo después realizar las pruebas SQL. Las cuatro fases oficiales constan en `IMPORTADORA_AN_PLAN_MAESTRO_REVISADO_V2.md`.
