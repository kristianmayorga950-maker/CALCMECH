# Lecciones (rediseño Tornillo de Potencia)

## 2026-09-30 — Referencias bibliográficas fuera de la UI
- **Corrección:** no mostrar números de ecuación ni libros guía dentro del proceso de cálculo.
- **Regla:** `ref` y `origin` son metadatos internos del motor, para auditoría y para `docs/power-screw/METODOLOGIA.md`. Los componentes de UI nunca los renderizan.

## 2026-09-30 — No ampliar catálogos "por completitud"
- **Corrección:** propuse agregar tamaños Acme (¼…3 in) solo porque existen en la tabla del libro.
- **Regla:** antes de agregar datos, preguntarse si tienen sentido de ingeniería para el caso. En tornillos de potencia, un paso mayor empeora los esfuerzos en el núcleo y el autobloqueo.

## 2026-09-30 — Tablas con rangos o huecos
- **Regla:** si un dato de tabla cae en un rango o en un hueco, usar el valor conservador por defecto; la interpolación lineal solo como opción y siempre declarada explícitamente en la traza.

## 2026-09-30 — Flexibilidad = cálculo progresivo, no ramas con campos obligatorios
- **Corrección:** diseñé ramas con campos obligatorios (p. ej. d_c exigido en Dimensionar).
- **Regla:** el motor calcula todo lo que tenga datos y señala lo que falta sin bloquear. El objetivo orienta, no restringe. Los datos de más se verifican, no se descartan.

## 2026-09-30 — Notación: nada de "código" visible
- **Corrección:** las unidades salían como `\cdotp` en rojo (puse `·` dentro de `\text{}`) y los criterios mostraban `S_y`, `n_obj` en texto plano.
- **Regla:** unidades en KaTeX con `\mathrm{N\cdot mm}` (nunca `\text{N·mm}`). Todo símbolo con subíndice pasa por el formateador (HTML `<sub>` o KaTeX). Revisar con una captura antes de entregar: si se ve un `\` o un `_`, está mal.
- **Regla:** verificar visualmente en el navegador antes de reportar; si el artifact pide iniciar sesión, servirlo localmente con la configuración "prototipo" de `.claude/launch.json`.

## 2026-09-30 — CSS en rejillas
- **Hallazgo:** un `inline-block` dentro de un grid se estira a todo el ancho (los hijos de un grid se convierten en bloque). Para subrayar solo el contenido: `justify-self: start`.
- **Hallazgo:** un contenedor con `height: auto` dentro de `<main overflow:hidden>` crece y queda recortado sin poder desplazarse. El contenedor debe conservar `height: 100%` y desplazar él mismo.
- **Regla:** el código de interfaz de un subagente se revisa siempre en el navegador, en escritorio, móvil y ambos temas, antes de reportarlo.

## 2026-10-01 — Clases nuevas de Tailwind y recarga en caliente
- **Hallazgo:** al agregar clases de Tailwind nuevas en un archivo ya cargado, la recarga en caliente aplicó las clases al DOM pero el CSS seguía viejo (la barra medía 256 px con `w-16`).
- **Regla:** después de agregar clases de Tailwind, recargar la página antes de medir o capturar; no concluir que el código falla sin recargar.

## 2026-10-01 — Acciones que cambian supuestos ocultos
- **Hallazgo:** "usar el tamaño recomendado" despachaba la acción del catálogo, que además cambiaba la rosca a Acme; el resultado aplicado no era el que se dimensionó.
- **Regla:** cuando un botón aplica el resultado de un cálculo, verificar que los supuestos con los que se calculó (forma de rosca, apoyo, etc.) se conservan al aplicarlo.

## 2026-10-01 — La regla de notación vale también para textos libres
- **Corrección:** los planteamientos de los ejemplos traían "d_c" y "f_c" escritos como texto.
- **Regla:** cualquier texto que llegue a la pantalla (planteamientos, notas, mensajes) se escribe en palabras o pasa por KaTeX; hay una prueba que rechaza "_" o "\" en los planteamientos.
