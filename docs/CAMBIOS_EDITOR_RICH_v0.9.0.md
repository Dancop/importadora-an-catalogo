# Cambios del editor enriquecido — v0.9.0

## Objetivo

Permitir que las descripciones de productos tengan formato básico sin obligar al usuario a escribir HTML manualmente.

## Campos

- `descripcion`: Descripción general.
- `detalle_distintivo`: Contenido de esta presentación.

## Formatos permitidos

- Negrita
- Cursiva
- Subrayado
- Lista con viñetas
- Lista numerada

## Seguridad

El contenido se procesa mediante una lista de elementos HTML permitidos. Se eliminan elementos no autorizados y atributos HTML antes de guardar y antes de renderizar públicamente.

## Compatibilidad

No se requiere migración de datos ni SQL adicional. El contenido existente en texto plano continúa siendo válido.

## UX/UI

En escritorio, el formulario de edición utiliza una sola columna principal y las secciones secundarias se distribuyen debajo de la sección comercial. La sección de descripción ocupa el ancho disponible, evitando el editor estrecho que existía en la distribución lateral.

En móvil se mantiene una sola columna y la barra de herramientas se adapta al ancho disponible.
