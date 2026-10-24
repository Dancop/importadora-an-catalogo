# Reconstrucción y conciliación de inventario histórico

## 1. Objetivo

Este documento registra la reconstrucción del inventario histórico de **Importadora A&N** antes de realizar la migración desde el modelo de inventario actual hacia el nuevo modelo basado en grupos, stock por grupo, transferencias, ventas y liquidaciones.

La finalidad es evitar duplicar unidades que ya fueron incorporadas manualmente al inventario y posteriormente vendidas.

> **Importante:** este documento describe una reconstrucción basada en los datos actualmente disponibles. No constituye todavía una modificación de datos en Supabase.

## 2. Fuentes utilizadas

La reconstrucción se realizó utilizando:

- Datos actuales de `inventario_privado`.
- Historial de `ventas` y `detalle_ventas`.
- Historial de `movimientos_inventario`.
- Registro conocido de los dos primeros lotes de mercadería.
- Relación establecida mediante el **SKU**, que es el identificador estable del producto.

Las consultas utilizadas para diagnóstico se encuentran documentadas separadamente y no forman parte del código de ejecución normal de la aplicación.

## 3. Regla fundamental de reconstrucción

El inventario no debe reconstruirse simplemente sumando:

```text
Lote 1 + Lote 2
```

al stock actual.

Esto produciría duplicación porque parte del Lote 2 fue agregada manualmente al inventario actual y posteriormente utilizada en ventas.

La reconstrucción debe distinguir entre:

1. Mercadería originalmente recibida.
2. Mercadería incorporada al inventario.
3. Mercadería vendida.
4. Stock actualmente disponible.
5. Mercadería recibida pero que todavía no fue incorporada al inventario.

# 4. Lote 1 — Inventario inicial

## 4.1 Datos originales

El primer lote estuvo compuesto por **144 unidades** y fue enviado mediante **LUPJANSA**.

- Fecha de envío: **10/07/2026**
- Fecha de recojo: **13/07/2026**
- Propietario original: grupo de origen / Oruro.

La distribución comercial original fue:

| Producto | Cantidad |
|---|---:|
| Set Corazón Elegance para Mujer | 12 |
| Set Glamour Tacón para Dama | 6 |
| Set Ejecutivo Prestige para Caballero | 7 |
| Set Encanto para Dama | 12 |
| Set Clásico para Caballero | 6 |
| Set TOMI Ejecutivo | 12 |
| Set CARYINO | 18 |
| Set JESOU para Caballero | 32 |
| Set Dúo para Caballero | 24 |
| Estuche Joyero | 15 |
| **Total** | **144** |

### Confirmación especial de TOMI

Las **12 unidades iniciales de TOMI** corresponden al SKU:

```text
GFT-M-003-NE
```

No deben interpretarse como 12 unidades de cada presentación.

# 5. Reconstrucción del Lote 1 por SKU

A partir del historial de movimientos de inventario y de los stocks iniciales observables antes de las primeras ventas, se pudo reconstruir la distribución del Lote 1 por SKU.

| Producto | SKU | Lote 1 |
|---|---|---:|
| Estuche Joyero Azul Tiffany | `GFT-W-004-CE` | 5 |
| Estuche Joyero Negro | `GFT-W-004-NE` | 5 |
| Estuche Joyero Rosa | `GFT-W-004-RS` | 5 |
| Set CARYINO | `GFT-M-004-NE` | 18 |
| Set Clásico para Caballero | `GFT-M-002-CA` | 6 |
| Set Corazón Elegance para Dama — Café | `GFT-W-001-CA` | 5 |
| Set Corazón Elegance para Dama — Azul | `GFT-W-001-AZ` | 3 |
| Set Corazón Elegance para Dama — Rojo | `GFT-W-001-RO` | 4 |
| Set Dúo para Caballero | `GFT-M-006-MX` | 24 |
| Set Ejecutivo Prestige — Azul | `GFT-M-001-AZ` | 1 |
| Set Ejecutivo Prestige — Café | `GFT-M-001-CA` | 4 |
| Set Ejecutivo Prestige — Negro | `GFT-M-001-NE` | 2 |
| Set Encanto — Azul | `GFT-W-003-AZ` | 7 |
| Set Encanto — Rosa | `GFT-W-003-RS` | 1 |
| Set Encanto — Negro | `GFT-W-003-NE` | 4 |
| Set Glamour — Rosa | `GFT-W-002-RS` | 1 |
| Set Glamour — Rojo | `GFT-W-002-RO` | 1 |
| Set Glamour — Negro | `GFT-W-002-NE` | 4 |
| Set JESOU para Caballero | `GFT-M-005-MX` | 32 |
| Set TOMI Ejecutivo | `GFT-M-003-NE` | 12 |
| **Total** | | **144** |

## 5.1 Criterio utilizado

La reconstrucción se considera consistente con el Lote 1 porque:

- Los stocks iniciales observados en los primeros movimientos coinciden con las cantidades reconstruidas.
- Los productos que no tuvieron movimientos mantienen actualmente la cantidad correspondiente al Lote 1, descontando únicamente las ventas cuando estas existen.
- La suma de todos los SKU reconstruidos es exactamente **144 unidades**.

Por tanto:

> **Lote 1 queda cerrado como reconstrucción histórica con 144 unidades.**

Esto no significa que se deba insertar nuevamente esas 144 unidades en el inventario actual. El objetivo es utilizarlas como referencia para separar el inventario histórico del inventario posteriormente incorporado.

# 6. Lote 2 — Mercadería recibida posteriormente

El segundo lote fue enviado mediante **Chino Bus**.

- Fecha de envío: **11/09/2026**
- Fecha de recojo: **13/09/2026**
- Cantidad recibida: **232 unidades**.

La información original del lote fue registrada con nombres comerciales/informales:

| Descripción del envío | Cantidad |
|---|---:|
| Set Tomi café | 34 |
| Set Tomi negro | 57 |
| Set joyero rosado | 16 |
| CSet joyero negro | 16 |
| CSet joyero turquesa | 16 |
| Set Jesou Reloj + Manillas | 40 |
| Set Jesou Gafas Mujer Rosado | 6 |
| Set Jesou Gafas Mujer Azul | 2 |
| Set Jesou Gafas Mujer Negro | 5 |
| Set Jesou Mediano Hombre Negro | 6 |
| Set Jesou Mediano Hombre Café | 6 |
| Set Jesou Perfume Hombre Negro | 5 |
| Set Jesou Perfume Hombre Azul | 5 |
| Set Jesou Perfume Hombre Café | 6 |
| Set Corazón Rojo | 4 |
| Set Corazón Azul | 5 |
| Set Corazón Café | 3 |
| **Total** | **232** |

### Advertencia

Estos nombres **no deben convertirse automáticamente en nuevos SKU**.

Primero deben relacionarse con los productos existentes del catálogo.

En particular:

```text
CSet joyero negro
CSet joyero turquesa
```

requieren confirmación/mapeo antes de incorporarlos al nuevo modelo.

# 7. Criterio oficial para reconstruir el Lote 2

El Lote 2 presenta una situación diferente al Lote 1 porque, antes de contar con el módulo de inventario consolidado, se realizaron ajustes manuales de stock para permitir registrar ventas.

Estos ajustes fueron operativos y **no deben interpretarse automáticamente como entradas formales de inventario**.

Por lo tanto, la reconstrucción se hará utilizando las ventas históricas como evidencia.

## 7.1 Regla de Stock 1 y Stock 2

Se define:

- **Stock 1:** cantidad original reconstruida del primer lote.
- **Stock 2:** mercadería posterior que necesariamente tuvo que existir cuando las ventas superaron la cantidad disponible del Stock 1.
- **Stock ficticio/ajuste:** cantidad que permanezca actualmente en el inventario pero que no pueda justificarse como mercadería física real. Estas cantidades se llevarán a **0** al consolidar el nuevo módulo.

La fórmula de referencia es:

```text
Stock 2 mínimo necesario =
MAX(0, unidades vendidas acumuladas - Stock 1)
```

Ejemplo:

```text
Stock 1 = 12
Ventas acumuladas = 13

Stock 2 mínimo necesario = 13 - 12 = 1
```

Esto permite determinar qué unidades adicionales son necesarias para explicar las ventas sin tener que confiar en todos los ajustes manuales realizados durante la operación del catálogo.

## 7.2 Regla de interpretación

Si las ventas **no superan** el Stock 1:

```text
No se puede afirmar que hubo Stock 2.
```

Esto no significa necesariamente que no haya llegado mercadería posterior; significa solamente que no es necesario utilizar Stock 2 para explicar las ventas registradas.

Si las ventas **superan** el Stock 1:

```text
La diferencia es evidencia de Stock 2 mínimo.
```

El stock actual restante no se considerará automáticamente real. Deberá justificarse como remanente físico o, de no existir esa evidencia, tratarse como ajuste/ficticio.

# 8. Ajustes manuales realizados durante la operación

Según la explicación posterior del proceso, se realizaron algunos ajustes manuales antes de implementar el nuevo módulo.

## 8.1 TOMI del primer SKU

El SKU original:

```text
GFT-M-003-NE
```

correspondía a las 12 unidades del Lote 1.

Se añadió manualmente al menos una unidad para permitir que se registrara una venta. Posteriormente se fueron realizando ajustes de manera gradual mientras se registraban ventas.

Por lo tanto, el stock actual de este SKU no debe utilizarse por sí solo para determinar cuánto era mercadería física real.

La cantidad de Stock 2 se determinará principalmente comparando:

```text
Stock 1 = 12
vs.
ventas históricas acumuladas
```

## 8.2 TOMI negro con fondo negro

Posteriormente se separaron los TOMI de fondo negro de los TOMI de fondo plateado.

Se utilizó:

```text
GFT-M-003-NE2
```

para los TOMI de fondo negro.

Se colocaron inicialmente **10 unidades** y desde allí se fueron descontando las ventas.

Estas 10 unidades deben considerarse un **ajuste operativo conocido**, pero no necesariamente como la cantidad total recibida del Lote 2.

## 8.3 TOMI café

También aparece:

```text
GFT-M-003-CA
```

con una cantidad inicial observable de 10 unidades antes de sus ventas.

Al igual que en el caso anterior, esto se considera un ajuste operativo histórico y no una recepción formal registrada.

## 8.4 Producto para dama con una unidad ficticia

Existió un producto para dama que tenía 1 unidad real. La unidad se vendió y, para que el producto continuara apareciendo disponible en el catálogo, se añadió posteriormente **+1 unidad ficticia**.

Esta unidad no representa mercadería física y deberá quedar en:

```text
stock = 0
```

cuando se consolide el nuevo módulo de inventario.

## 8.5 Otros productos

No se recuerda haber realizado ajustes manuales adicionales en joyeros, Corazón u otros productos.

Por ello, no se debe asumir que esos productos recibieron Stock 2 únicamente porque aparecen en el segundo lote. Su conciliación se realizará mediante la regla de ventas contra Stock 1.

# 9. Aplicación de la regla a los datos históricos

El procedimiento de reconstrucción será:

```text
1. Obtener Stock 1 por SKU.
        ↓
2. Obtener ventas históricas válidas por SKU.
        ↓
3. Comparar ventas contra Stock 1.
        ↓
4. Si ventas > Stock 1:
       reconocer la diferencia como Stock 2 mínimo.
        ↓
5. Revisar el stock actual.
        ↓
6. Separar stock físicamente justificable de ajustes/ficticio.
        ↓
7. Consolidar el inventario real en el nuevo módulo.
```

Las anulaciones y reversiones de ventas no deben contarse como ventas adicionales. Para este cálculo debe utilizarse la venta histórica en su estado final y/o el historial de movimientos correctamente compensado.

# 10. Situación del Lote 2

El segundo lote contiene 232 unidades físicas. Sus descripciones de transporte no deben convertirse automáticamente en nuevos SKU.

La reconstrucción del stock real es independiente de los ajustes temporales realizados en la aplicación.

| Familia | Situación actual |
|---|---|
| TOMI café | Se usó `GFT-M-003-CA`; hubo ajuste operativo de 10 unidades |
| TOMI negro fondo negro | Se usó `GFT-M-003-NE2`; hubo ajuste operativo de 10 unidades |
| TOMI original/fondo plateado | Se mantuvo el SKU `GFT-M-003-NE`; las ventas se conciliarán contra Stock 1 = 12 |
| Joyeros | No se recuerda ajuste manual; no asumir Stock 2 sin evidencia de ventas que lo requieran |
| Corazón | No se recuerda ajuste manual; no asumir Stock 2 sin evidencia de ventas que lo requieran |
| JESOU | Requiere conciliación/mapeo de presentaciones y SKU |

# 11. Regla para la consolidación futura

Cuando se implemente el nuevo módulo de inventario, el inventario actual se tratará como una fuente histórica que puede contener:

```text
Stock 1 real
+
Stock 2 mínimo demostrado por ventas
+
posibles ajustes manuales
+
posibles unidades ficticias
```

El objetivo será transformarlo en:

```text
INVENTARIO CONSOLIDADO

Stock físico real confirmado
        +
Stock 2 físicamente confirmado
        -
Ventas históricas
        =
Stock real actual
```

Los ajustes que no puedan justificarse como mercadería física se eliminarán mediante un ajuste de inventario documentado, dejando el stock correspondiente en **0**.

No se deben borrar las ventas ni los movimientos históricos utilizados para realizar la reconstrucción.

# 12. Futuros lotes

Cuando el módulo de inventario consolidado esté implementado, el nuevo lote se registrará como una **entrada de inventario real**, no como un ajuste manual de stock.

La recepción deberá quedar asociada al grupo propietario correspondiente y generar su movimiento de inventario.

Para futuros lotes:

```text
Recepción de mercadería
        ↓
Entrada formal de inventario
        ↓
Stock por grupo
        ↓
Venta
        ↓
Movimiento de salida
```

Esto elimina la necesidad de modificar manualmente el campo `stock` para que un producto pueda venderse.

# 13. Estado de la reconstrucción

| Etapa | Estado |
|---|---|
| Identificar inventario inicial | Completado |
| Reconstruir Stock 1 | Completado — 144 unidades |
| Verificar suma del Stock 1 | Completado |
| Identificar Lote 2 físico | Completado — 232 unidades |
| Identificar ajustes manuales conocidos | Completado parcialmente |
| Definir regla Stock 1 vs. Stock 2 | **Completado** |
| Calcular Stock 2 mínimo por SKU | Pendiente de cálculo consolidado |
| Identificar stock ficticio | Pendiente de consolidación |
| Crear módulo de inventario | En implementación |
| Consolidar inventario histórico | Pendiente |
| Registrar futuros lotes mediante entradas formales | Pendiente |

# 14. Regla de seguridad de datos

Mientras el módulo consolidado no esté implementado:

- No agregar nuevamente las 144 unidades del Stock 1.
- No agregar automáticamente las 232 unidades del Lote 2 al stock actual.
- No eliminar ventas históricas.
- No eliminar movimientos históricos.
- No modificar los SKU históricos para "hacerlos coincidir".
- No convertir automáticamente los ajustes manuales en entradas de inventario.
- No considerar como mercadería real una unidad únicamente porque aparece actualmente en `inventario_privado`.
- No ejecutar todavía la consolidación definitiva del stock.

# 15. Identificador histórico de productos

El SKU continúa siendo el identificador estable del producto.

En las ventas históricas existen:

```text
detalle_ventas.sku
detalle_ventas.producto_nombre
```

El SKU mantiene la relación con el producto, mientras que `producto_nombre` conserva el nombre utilizado al momento de la venta.

Por lo tanto, un cambio futuro de nombre no debe romper la relación histórica mientras el SKU permanezca estable.

# 16. Conclusión

La estrategia de reconstrucción queda definida de la siguiente manera:

```text
STOCK 1
144 unidades
└── cantidades originales reconstruidas por SKU

        ↓

VENTAS HISTÓRICAS
└── determinan si fue necesario utilizar Stock 2

        ↓

STOCK 2
└── mínimo demostrado:
    MAX(0, ventas acumuladas - Stock 1)

        ↓

STOCK ACTUAL
└── se revisa por separado
    ├── físicamente justificable → conservar
    └── ficticio/ajuste → llevar a 0

        ↓

MÓDULO DE INVENTARIO CONSOLIDADO
└── stock real por grupo

        ↓

FUTUROS LOTES
└── entradas formales de inventario
```

Esta metodología evita duplicar el Lote 2 y permite limpiar los ajustes temporales sin perder el historial de ventas.

El siguiente paso técnico es completar el **módulo de inventario consolidado** y utilizar esta reconstrucción solamente como base para la migración inicial.
