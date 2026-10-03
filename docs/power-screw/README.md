# Tornillo de potencia — Documentación final del rediseño

Sección "Tornillo de potencia" de CALCMECH, rediseñada desde cero en 8 loops con revisión del usuario al final de cada uno. Este documento resume qué se construyó, cómo se verificó y qué falta decidir.

| Documento | Contenido |
|---|---|
| [METODOLOGIA.md](METODOLOGIA.md) | Ecuaciones, origen de cada una, tablas, grafo de dependencias, ramas, supuestos y decisiones de implementación |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Aislamiento, motor, unidades, validación, pruebas y visualización |
| `tasks/todo.md` y `tasks/lessons.md` | Avance por loop y lecciones aprendidas de las correcciones |

---

## 1. Qué hace la sección

- **Cálculo progresivo.** No hay campos obligatorios ni botón "Calcular". Cada resultado aparece en cuanto tiene sus datos; lo que falta se marca sin bloquear ("falta f_c"), con una sugerencia del dato que más resultados desbloquea.
- **Tres mecanismos de entrada:**
  - par directo;
  - palanca (una o dos manos);
  - reductor;

  más un apoyo de empuje opcional (collarín o rodamiento). Agregar otro mecanismo es un archivo nuevo, sin tocar el motor.
- **Cinco objetivos.** Analizar, capacidad, accionamiento, dimensionar y avance. El objetivo solo orienta lo que se resalta.
- **Traza en el estilo cuaderno de ingeniería.** Cada paso muestra ecuación, variables, sustitución y resultado en KaTeX, sin números de ecuación ni referencias bibliográficas (decisión del usuario).
- **Verificaciones (8).** Cada una con su criterio, valor calculado, valor requerido, estado en texto y explicación. Arriba se muestra el veredicto con el criterio que gobierna.
- **Dimensionamiento.** Recorre el catálogo Acme ½–2 in, calcula los filetes mínimos por desgaste y recomienda el menor tamaño que cumple, explicando qué descarta a cada uno.
- **Cuatro gráficos con propósito**, cada uno con su interpretación plegada ("Qué significa"):
  1. desglose del par;
  2. eficiencia vs ángulo de avance con la frontera de autobloqueo;
  3. utilización por verificación;
  4. reparto de carga en la tuerca.
- **Menú "Proyecto".**
  - Dos ejemplos completos con su planteamiento.
  - Guardar, guardar una copia, abrir y borrar (en este navegador).
  - Exportar e importar JSON validado.
  - Informe en Markdown.
  - Reiniciar.
- **Unidades.** Selector por campo, conversiones visibles y sustitución en unidades coherentes (N, mm, MPa).

## 2. Ramas de cálculo

| Rama | Datos típicos | Resultado |
|---|---|---|
| Analizar | geometría, carga, fricción | pares, eficiencia, autobloqueo, esfuerzos, pandeo, desgaste, factores de seguridad |
| Capacidad | geometría, fricción y lo aplicado (par, P·r, motor) | carga máxima (despeje exacto: el par es lineal en F) |
| Accionamiento | geometría, carga y parte de la transmisión | P, r, par del motor y ventaja mecánica |
| Dimensionar | carga, material, n objetivo, p_b | tamaño, filetes mínimos y longitud de tuerca |
| Avance | diámetro y fricción | avance y número de entradas máximos que conservan el autobloqueo |

Las ramas no son formularios distintos: es el mismo grafo de reglas con alternativas. Por ejemplo, F puede ser un dato o salir despejada de la entrada. Si se dan datos de más, no se descarta ninguno: se compara en la verificación "entrada suficiente".

## 3. Supuestos principales

Detalle completo en METODOLOGIA §7–§8.

- Las relaciones de la rosca de potencia son las de la Fig. 8-3: d_m = d − p/2 y d_r = d − p.
- Rosca Acme: el libro solo da el par de subida; el par de bajada y el autobloqueo se derivaron con la misma regla del libro.
- Par en el cuerpo: total (T_R + T_c) por defecto, como en el Ejemplo 8-1, con un selector para usar solo el de la rosca.
- Esfuerzo máximo en el filete con 0.38F y n_t = 1. El desgaste se verifica aparte, con la carga completa repartida en todos los filetes, contra p_b.
- p_b conservador: extremo inferior del rango y fila de velocidad superior en los huecos; interpolación opcional y declarada. Con accionamiento manual se usa la fila de baja velocidad.
- Autobloqueo verificado con el extremo bajo de la fricción de tabla; el par se calcula con el extremo alto.
- Pandeo: Euler o Johnson según la esbeltez; C conservador de la Tabla 4-2.
- Catálogo Acme limitado a ½–2 in (decisión del usuario: pasos mayores empeoran el núcleo y el autobloqueo). No se incluye la rosca métrica Tr.

## 4. Estrategia de validación

1. **Contra el libro.** El Ejemplo 8-1 se escribió como prueba antes del código (roja) y reproduce los 10 valores publicados. Los materiales se verificaron contra la Tabla A-20 del PDF, y la Tabla 8-4 se revisó como imagen.
2. **Propiedades con fast-check.** Cada propiedad se confirmó plantando un error a propósito y viendo la prueba ponerse en rojo.
   - Capacidad y análisis son inversos.
   - T_R > T_0 y 0 < e < 1.
   - Autobloqueo ⇔ T_L > 0.
   - Acme pide más par que la rosca cuadrada.
   - El par es proporcional a la carga.
   - Continuidad Euler–Johnson.
   - Más carga nunca recomienda un tornillo menor.
   - Ida y vuelta de unidades.
   - El solver nunca falla y un dato extra nunca borra un resultado.
   - Guardar y cargar devuelve el mismo estado.
3. **Casos límite.**
   - Datos faltantes.
   - Valores cero, negativos o no enteros.
   - Rosca trabada (π d_m ≤ f l sec α).
   - Cambio de mecanismo y vuelta atrás.
   - Tensión.
   - Edición de valores de tabla.
   - Reiniciar y cargar.
   - Archivos importados dañados.
4. **En el navegador**, en escritorio y teléfono, con tema claro y oscuro. Cada entrega de interfaz se revisó con capturas antes de reportarla.

**Hallazgos reales de las pruebas:**
- un valor finito que se volvía infinito al convertir unidades;
- un resultado pendiente que no explicaba por qué falló su alternativa;
- la rosca que cambiaba a Acme al aplicar un tamaño dimensionado;
- símbolos con "_" visibles en textos.

## 5. Pruebas realizadas (al cierre)

| Archivo | Pruebas | Qué cubre |
|---|---|---|
| example81 | 12 | Ejemplo 8-1 completo, incisos a)–h) |
| engine | 28 | propiedades de ingeniería, palanca, reductor, datos de más, tabla 8-4, accionamiento manual |
| solver | 15 | cálculo progresivo, alternativas, bloqueos, totalidad |
| edgeCases | 18 | casos límite |
| examples | 14 | los dos ejemplos y sus planteamientos |
| problemState | 11 | estado, tablas, unidades, aplicar dimensionamiento |
| units | 13 | conversiones |
| persistence | 9 | guardar, cargar, importar, informe |
| summary | 7 | veredicto, utilización, curva e–λ |
| sizing | 5 | dimensionamiento |
| interpret | 5 | interpretación de gráficos |
| **Total** | **137** | además, las pruebas existentes de tensión y cortante siguen pasando sin cambios |

- **Rendimiento medido:** un cálculo completo tarda 0.4 ms y un dimensionamiento con los 9 tamaños 4.3 ms.
- **Accesibilidad:** ningún campo sin etiqueta, ningún botón sin nombre y estados escritos además del color. Los colores de los gráficos se validaron con el script de la skill de visualización.

## 6. Skills y modelos usados

| Skill | Para qué | Dónde |
|---|---|---|
| graphify | grafo del proyecto para entender la arquitectura existente | inicio |
| frontend-design | tres direcciones visuales; el usuario eligió "cuaderno de ingeniería" | Loop 3 |
| dataviz | elección de cada gráfico, paleta validada contra el fondo del cuaderno, reglas de marcas | Loop 6 |
| property-testing (nyxandro, revisada antes de instalar) | pruebas por propiedades con fast-check, con el paso obligatorio de plantar errores | Loops 3–7 |
| artifact-design | prototipos interactivos del flujo y de las direcciones visuales | Loops 2–3 |

**Modelos:**
- **Opus 5.5:** metodología, motor, solver, verificaciones, pruebas, revisión y corrección de todo lo entregado.
- **Sonnet 5.5:** componentes de interfaz sobre contratos ya fijados y probados (riel, traza, gráficos, menú).
- **Fable 5.1:** no se usó, por posible costo adicional (decisión del usuario).

## 7. Comparación con la versión anterior

| Aspecto | Antes | Ahora |
|---|---|---|
| Flujo | un formulario fijo y botón Calcular | cálculo progresivo, sin campos obligatorios |
| Caminos | analizar, más un barrido por fluencia del cuerpo | 5 ramas en un mismo motor, incluidas las inversas |
| Mecanismos | tornillo con collarín opcional | directo, palanca, reductor y apoyo opcional |
| Ecuaciones | lista de fórmulas, algunas con número equivocado; KaTeX sin cargar | traza con ecuación, variables, sustitución y resultado |
| Raíz del filete | Von Mises del cuerpo solamente | estado 3D en la raíz con 0.38F, principales y τ máx |
| Pandeo y desgaste | no existían | Euler/Johnson y p_b de la Tabla 8-4 |
| Verificaciones | avisos con umbrales fijos inventados | 8 criterios con calculado, requerido y criterio que gobierna |
| Unidades | conmutador global | por campo, con conversiones visibles |
| Gestión | ninguna | ejemplos, guardar, abrir, exportar, importar e informe |

## 8. Pendiente de decisión del usuario: código viejo

El tornillo de potencia viejo ya no se muestra (`App.tsx` renderiza la sección nueva), pero su código sigue en el proyecto y lo usan partes compartidas. Borrarlo exige tocar archivos comunes, así que **no se hizo nada sin aprobación**. Ver la propuesta en el mensaje de cierre del Loop 8.

Tampoco se actualizaron, por estar fuera de alcance:
- el manual en la app (`UserManual.tsx`, apartado 5);
- `docs/MANUAL_DE_USO.md`;
- los PDF de `public/`;
- la sección "Architecture" de `CLAUDE.md`.

Todos describen la versión vieja del tornillo de potencia.
