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


## Evolución v0.9.1

- La portada es el estado inicial y no implica una presentación seleccionada.
- La selección de una presentación es una acción explícita.
- El visor ocupa toda la pantalla para maximizar el área útil de fotografía.
- Las imágenes se contienen dentro del área disponible para preservar el producto completo.
- En móvil las tarjetas de presentación son más compactas y dejan visible parte de la siguiente opción para comunicar que existe desplazamiento horizontal.
- Cada presentación puede tener un enlace profundo propio, lo que permite compartir directamente una combinación concreta de producto/presentación.
