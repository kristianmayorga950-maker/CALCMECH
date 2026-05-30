# Contenido de la aplicación — CALCMECH

Documento de alcance: todo lo que incluye la aplicación web, tanto a nivel de
funcionalidad para el usuario como a nivel técnico.

🌐 <https://kristianmayorga950-maker.github.io/CALCMECH/>

---

## 1. Módulos de cálculo

### 1.1 Tornillo de potencia (§8-1, §8-2)
- Roscas Acme (α = 14.5°) y cuadrada (α = 0°), una o varias entradas.
- Geometría: diámetro medio dm, de raíz dr, avance L, ángulo de avance λ.
- Torque de subida TR y de bajada TL (con secα para Acme).
- Torque de collarín Tc y torque total.
- Eficiencia del tornillo e.
- Condición de **autobloqueo**.
- Esfuerzo axial, de torsión y de **Von Mises** en el cuerpo.
- Esfuerzos en el filete: **aplastamiento**, **flexión** y **cortante**.
- Factor de seguridad contra fluencia (si se da material).

### 1.2 Junta a tensión (§8-3 a §8-11 + Norton §11)
- Rigidez del perno **kb** y de los elementos **km**.
- Métodos de km: **Cornwell FEA** (Tabla 11-8, interpolación por j = d/l, una o dos placas) y **Wileman** (Ec. 8-23).
- Constante de junta **C** (y C efectiva con empaque no confinado).
- Precarga **Fi** (reutilizable 0.75·Fp, permanente 0.90·Fp o personalizada).
- Par de apriete T = K·Fi·d (factor K, Tabla 8-15).
- Factores de seguridad: de carga **np**, de separación **n0**, de fluencia **ny**.
- **Fatiga**: criterios de Goodman, Gerber y ASME-elíptica.
- Longitudes de agarre por **Tabla 8-7** (cálculo automático de LT, ld, lt).
- **Uniones con empaque**: confinado y no confinado (rigidez kg = Ag·Eg/tg), presión de sellado y verificación de espaciado entre pernos (Ec. 8-34).

### 1.3 Junta a cortante (§8-12)
- Centroide del grupo de pernos.
- Cortante **directo** F′ = V/n y cortante **por momento** F″ (carga excéntrica).
- Fuerza resultante en el perno más cargado.
- Esfuerzo cortante del perno (τadm = 0.577·Sp).
- **Aplastamiento** en la placa (Ec. 8-49, σadm = 0.9·Sy).
- **Tensión en el área neta** (σadm = 0.6·Sy).
- Veredicto del criterio que gobierna.

### 1.4 Diseño iterativo automático (Tornillo y Cortante)
- Barrido del producto cartesiano cuerda × material / perno × grado.
- Evaluación de cada combinación con los cálculos del libro.
- Ranking por diámetro y recomendación del **menor tamaño viable** (n ≥ objetivo).
- Tabla de candidatos completa, configurable (estándar, modo de área).

---

## 2. Datos de referencia incluidos

- **Roscas:** UNC, UNF, ISO métrico y Acme (diámetros, paso, áreas At/Ar).
- **Materiales de pernos:** clases ISO 3.6 … 12.9 (Tabla 8-11) y grados SAE 1 … 8.2 (Tabla 8-9), con Sp, Sy, Sut, Se.
- **Materiales de tornillo de potencia:** acero 1020, 1040, 4140 e inoxidable 304.
- **Constantes de Wileman** (Tabla 8-8) para acero, aluminio, cobre y hierro colado.
- **Constantes de Cornwell** (Tabla 11-8) para la rigidez de los elementos.
- **Factores K** del par de apriete (Tabla 8-15).
- **Materiales de empaque** (Norton Tabla 11-10).

---

## 3. Funciones de la interfaz

- Pantalla de inicio con selección de calculadora.
- Espacio de trabajo de dos columnas (entrada / resultados).
- **Manual de uso** integrado (botón en la barra lateral y en el inicio).
- Cambio de **unidades** SI ↔ Imperial con conversión automática.
- **Tema claro / oscuro** con persistencia.
- Secciones de formulario **plegables**.
- **Avisos de validación** flotantes que indican qué dato falta.
- **Tooltips** con fórmulas y notas.
- **Fórmulas** renderizadas en notación matemática (KaTeX).
- **Gráficos** interactivos de distribución de esfuerzos (Recharts).
- **Dashboard** de resultados.
- Tabla de **alternativas** y tabla de **diseño iterativo**.
- **Exportación a PDF** del dashboard.

---

## 4. Arquitectura técnica

- **Frontend:** React 18 + TypeScript, empaquetado con Vite.
- **Estilos:** Tailwind CSS con tokens de color por variables CSS (tema claro/oscuro).
- **Cálculo:** módulos de TypeScript puro, ejecutados en un **Web Worker** para no bloquear la interfaz.
- **Estado:** Context + useReducer (fuente única de verdad para las tres pestañas).
- **Datos:** tablas JSON cargadas al inicio (patrón singleton).
- **Pruebas:** 127 pruebas (unitarias e integración) con Vitest, validadas contra ejemplos del libro de Shigley.
- **Despliegue:** GitHub Pages mediante GitHub Actions (build automático en cada push).

---

## 5. Lo que la app **no** hace

- No guarda ni envía datos a ningún servidor (todo es local en el navegador).
- No reemplaza el criterio de ingeniería: las advertencias son orientativas.
- No cubre la pestaña de Tensión en modo de diseño automático (solo Tornillo y Cortante).

---

## 6. Referencias

1. Budynas, R. G. & Nisbett, J. K. *Diseño en Ingeniería Mecánica de Shigley*, 9.ª ed. McGraw-Hill, 2012. — Capítulo 8: Tornillos, sujetadores y diseño de uniones no permanentes (§8-1 a §8-12, Tablas 8-1, 8-2, 8-7, 8-8, 8-9, 8-11, 8-15).
2. Norton, R. L. *Diseño de Máquinas: Un Enfoque Integrado*, 4.ª ed. Pearson, 2011. — Capítulo 11: Tornillos y sujetadores; §11.8 uniones con empaque; Tablas 11-8 y 11-10.
3. Mott, R. L. *Diseño de Elementos de Máquinas*, 4.ª ed. Pearson. — Convenciones de unidades (SI) y esfuerzos admisibles.

---

*Documento generado para la aplicación CALCMECH — Universidad Industrial de Santander.*
