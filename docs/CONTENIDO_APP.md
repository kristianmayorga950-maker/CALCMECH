# Contenido de la aplicación — CALCMECH

Documento de alcance: todo lo que incluye la aplicación web, para el usuario y a nivel técnico.

<https://kristianmayorga950-maker.github.io/CALCMECH/>

---

## 1. Módulos de cálculo

### 1.1 Tornillo de potencia (§8-1, §8-2)
- **Configuraciones:** rosca cuadrada o Acme, una o varias entradas; transmisión por par directo, palanca (una o dos manos) o reductor (motor con sinfín y corona); apoyo de empuje ninguno, collarín o rodamiento; carga en compresión o tensión.
- **Motor de cálculo progresivo:** un grafo de reglas resuelve con los datos que haya, por cualquier camino válido (incluye despejar la carga, el par, la fuerza en la palanca o el brazo). Indica los datos que faltan, el próximo dato útil y por qué un paso no se puede calcular.
- **Geometría:** diámetro medio y de raíz, avance, ángulo de avance.
- **Pares:** de subir y de bajar la carga (con secα en la Acme), del collarín o rodamiento, total, de bajada y de arranque.
- **Eficiencia** de la rosca y global, y condición de **autobloqueo** con el extremo bajo del rango de fricción de la tabla.
- **Esfuerzos en el cuerpo:** axial, torsión y von Mises.
- **Esfuerzos en la rosca:** aplastamiento, flexión y cortante transversal en la raíz con el reparto de carga entre filetes, von Mises tridimensional, esfuerzos principales y cortante máximo.
- **Pandeo:** Euler o Johnson según la esbeltez, con la condición de extremos.
- **Desgaste:** presión de apoyo frente a la admisible de la tabla (criterio conservador o interpolación lineal declarada).
- **Cinemática y potencia:** velocidad de avance y potencia, si el accionamiento es con velocidad.
- **Verificaciones:** ecuación de par válida, autobloqueo, retención con el apoyo, fluencia en la raíz, fluencia en el cuerpo, pandeo, desgaste y entrada suficiente. Muestra la utilización de cada una y el criterio que gobierna.
- **Dimensionamiento:** recorre el catálogo Acme y propone el menor tamaño que cumple (opcionalmente exige autobloqueo).
- **Ejemplos resueltos:** tornillo con collarín (reproduce el Ejemplo 8-1) y gato con palanca.

### 1.2 Junta a tensión (§8-3 a §8-11 + Norton §11)
- Rigidez del perno **kb** y de los elementos **km** (Cornwell, interpolado por j = d/l, con una o dos placas; o Wileman).
- Constante de la junta **C** (y C efectiva con empaque no confinado).
- Precarga **Fi** (reutilizable 0.75·Fp, permanente 0.90·Fp o personalizada) y par de apriete T = K·Fi·d.
- Factores de seguridad de carga **np**, de separación **n0** y de fluencia **ny**.
- **Fatiga:** Goodman, Gerber y ASME elíptica.
- Longitudes de agarre automáticas.
- **Uniones con empaque:** confinado y no confinado, presión de sellado y verificación del espaciado entre pernos.

### 1.3 Junta a cortante (§8-12)
- Centroide del grupo de pernos.
- Cortante **directo** y **por momento** (carga excéntrica), y fuerza en el perno más cargado.
- Cortante del perno, **aplastamiento** en la placa y **tensión en el área neta**.
- Veredicto del criterio que gobierna.
- **Diseño automático:** barrido perno × grado y recomendación del menor perno que cumple (n ≥ objetivo).

---

## 2. Datos de referencia incluidos

- **Roscas:** UNC, UNF, ISO métrico y Acme. Para el tornillo de potencia, los tamaños Acme de ½ a 2 in con sus pasos preferidos.
- **Materiales de pernos:** clases ISO 3.6 a 12.9 y grados SAE 1 a 8.2, con Sp, Sy, Sut y Se.
- **Aceros del tornillo de potencia:** AISI 1010 a 1095, laminados en caliente y estirados en frío.
- **Tornillo de potencia:** fricción de la rosca por pareja de materiales, fricción del collarín (marcha y arranque), presión de apoyo admisible por material de tuerca y velocidad, condiciones de extremos para el pandeo y reparto de carga entre filetes.
- **Juntas:** constantes de Wileman y de Cornwell, factores K del par de apriete y materiales de empaque.

---

## 3. Funciones de la interfaz

- **Portada como plano de conjunto:** gato de tornillo en corte cuyas piezas 1, 2 y 3 abren cada calculadora, con lista de piezas, cajetín con los datos del curso, «Continuar» y proyectos guardados con miniatura.
- **Marco de plano en la app:** barra superior como cajetín y barra lateral como lista de piezas (plegable), con transición fluida entre la portada y la calculadora. Si se pide reducir movimiento, el cambio es instantáneo.
- **Tornillo de potencia:**
  - cálculo en vivo, sin botón;
  - ecuaciones en KaTeX con la forma general, la sustitución y el resultado;
  - esquema paramétrico del sistema con cotas reales;
  - gráficos con interpretación plegada;
  - unidades por campo.
- **Proyectos:**
  - guardar, abrir, duplicar, importar y exportar (.json), e informe en Markdown;
  - autoguardado de la sesión, que se recupera al volver o al recargar.
- **Juntas:** formularios plegables, avisos de validación, tooltips, dashboard con gráficos y exportación a PDF.
- **General:** unidades SI e imperial, tema claro u oscuro con persistencia, manual de uso integrado y manuales en PDF.

---

## 4. Arquitectura técnica

- **Frontend:** React 18 + TypeScript, empaquetado con Vite.
- **Tornillo de potencia** (`src/features/powerScrew/`): motor de reglas puro (sin React), estado propio con `useReducer` y cálculo en vivo en el hilo principal (menos de 1 ms por resolución). El esquema es SVG paramétrico generado como texto.
- **Juntas:** módulos de TypeScript puro ejecutados en un **Web Worker**, con estado en Context + `useReducer`.
- **Portada** (`src/components/landing/`): dibujo SVG propio y View Transitions del navegador.
- **Datos:** tablas JSON para las juntas, y tablas en TypeScript para el tornillo de potencia.
- **Pruebas:** 259 pruebas con Vitest, entre unitarias, de integración y de propiedades (fast-check), validadas contra ejemplos del libro.
- **Despliegue:** GitHub Pages con GitHub Actions; se publica en cada push a `main`.

---

## 5. Lo que la app no hace

- No envía datos a ningún servidor. Los proyectos y la sesión quedan en el navegador.
- No reemplaza el criterio de ingeniería; las advertencias son orientativas.
- La junta a tensión no tiene modo de diseño automático.

---

## 6. Referencias

1. Budynas, R. G. y Nisbett, J. K. *Diseño en Ingeniería Mecánica de Shigley*, 9.ª ed. McGraw-Hill, 2012. Capítulo 8.
2. Norton, R. L. *Diseño de Máquinas: Un Enfoque Integrado*, 4.ª ed. Pearson, 2011. Capítulo 11.
3. Mott, R. L. *Diseño de Elementos de Máquinas*, 4.ª ed. Pearson. Unidades y esfuerzos admisibles.

---

*Diseño de Máquinas II · Escuela de Ingeniería Mecánica · Universidad Industrial de Santander · 2026-1.*
