# UX de galería por presentación — v0.9.0

## Objetivo
Mostrar el producto como un modelo agrupado, pero permitir que cada presentación tenga sus propias fotografías y detalles sin obligar al cliente a abrir productos separados.

## Flujo
1. El cliente abre el modelo y ve la **portada general**, pensada para representar el conjunto de presentaciones.
2. Debajo de la fotografía aparecen las **presentaciones** disponibles con una miniatura y su estado.
3. Al seleccionar una presentación, la galería cambia a las fotografías de esa variante.
4. Si la variante tiene varias imágenes, se pueden recorrer con flechas, gesto lateral o miniaturas numeradas.
5. El panel de información se actualiza con precio, SKU, disponibilidad, colores, características y mensaje de WhatsApp de la presentación seleccionada.

## Por qué no se separan en productos independientes
Las presentaciones comparten un mismo modelo comercial. Separarlas visualmente como productos distintos duplicaría el catálogo y haría más difícil comparar las opciones. El modelo agrupado conserva una experiencia compacta y permite descubrir las variantes en un mismo contexto.

## Referencia de marketplaces
El patrón es consistente con el funcionamiento de marketplaces que modelan un producto principal (SPU) y sus variantes/SKU: una variante puede tener una imagen asociada y la selección de la variante actualiza la información visual y comercial. La documentación de Alibaba para variantes indica explícitamente que las imágenes pueden asociarse a la primera variación para permitir seleccionar opciones mediante una vista previa.

## Compatibilidad
No se cambia el esquema de Supabase. Se reutilizan `imagenes` por SKU/presentación e `imagen_portada` por `codigo_modelo`.
