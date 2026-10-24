# Diseño de reemplazo de editar_venta — V1

Estado: propuesta para pruebas, no desplegar en producción.

## Diagnóstico confirmado
La función actual devuelve al stock las cantidades originales, elimina todos los detalles y crea nuevos registros con costos vigentes. Se pierden los IDs y la valoración histórica.

## Contrato compatible
Conservar parámetros p_venta_id, p_productos, p_fecha, p_cliente_nombre, p_cliente_telefono, p_metodo_pago, p_observacion y retorno uuid. En p_productos, cada línea histórica incluye id_detalle; las líneas nuevas no.

## Requisitos
1. Validar sesión, permisos, venta completada y JSON válido.
2. Bloquear venta y SKU afectados en orden estable.
3. Verificar pertenencia y SKU de cada id_detalle; rechazar IDs repetidos.
4. Calcular variación neta de stock por SKU y comprobar disponibilidad.
5. Actualizar líneas existentes por ID preservando precio base, factores y costos históricos unitarios.
6. Insertar nuevas líneas con los factores vigentes.
7. Eliminar únicamente líneas omitidas.
8. Registrar movimientos por cambios netos, evitando reversión artificial de líneas intactas.
9. Recalcular totales desde detalles persistidos.
10. Garantizar rollback atómico ante errores.

## Pruebas de aceptación
Edición de precio y cantidad; dos líneas del mismo SKU con factores distintos; eliminación y alta; stock insuficiente; ID ajeno/repetido; SKU inválido; atomicidad; concurrencia; permisos y anulación.

Dependencias: validar trigger financiero candidato V3 y frontend del PR #1. No fusionar ni desplegar por separado.
