# Manual de uso — CALCMECH

**Calculadora de tornillos y juntas atornilladas**
Basada en Shigley, *Diseño en Ingeniería Mecánica* (9.ª ed.) y Norton, *Diseño de Máquinas* (4.ª ed.).

🌐 App en línea: <https://kristianmayorga950-maker.github.io/CALCMECH/>

---

## 1. ¿Qué es CALCMECH?

CALCMECH es una aplicación web que automatiza tres tipos de cálculo de elementos de sujeción:

| Calculadora | Qué resuelve | Referencia |
|---|---|---|
| **Tornillo de potencia** | Torques de subida/bajada, eficiencia, autobloqueo, esfuerzo de Von Mises en el cuerpo y esfuerzos en el filete. | §8-1, §8-2 |
| **Junta a tensión** | Rigideces (kb, km), constante de junta C, precarga, factores de seguridad, par de apriete, fatiga y empaques. | §8-3 a §8-11 |
| **Junta a cortante** | Cortante directo y excéntrico en grupos de pernos, aplastamiento y tensión en área neta. | §8-12 |

Todos los cálculos se ejecutan en tu navegador (no se envía nada a un servidor).

---

## 2. Cómo empezar

1. Abre la aplicación. Verás la **pantalla de inicio** con tres tarjetas.
2. Haz clic en la calculadora que necesites (**Tornillo de Potencia**, **Junta a Tensión** o **Junta a Cortante**).
3. Entrarás al **espacio de trabajo**, dividido en dos columnas:
   - **Izquierda — Datos de entrada:** los formularios donde ingresas los valores.
   - **Derecha — Resultados:** aparecen al presionar **⚡ CALCULAR**.
4. Para volver al inicio o cambiar de calculadora, usa el **menú lateral** izquierdo.

---

## 3. Controles generales de la interfaz

- **Unidades (SI / Imperial):** botón en la barra superior y sobre los resultados. Cambia todo entre milímetros/Newtons/MPa e in/lbf/kpsi. La conversión es automática.
- **Tema claro / oscuro:** botón ☀️ / 🌙 en la barra superior.
- **Secciones plegables:** cada bloque numerado del formulario se contrae o expande con el chevron ▾.
- **Avisos de validación:** si falta un dato, aparece un aviso flotante en la parte superior del panel indicando qué falta. Lo puedes cerrar con ✕.
- **Tooltips ⓘ:** pasa el cursor sobre el ícono para ver la fórmula o la nota correspondiente.

---

## 4. Modo de cálculo: Manual vs. Diseño automático

Las calculadoras de **Tornillo de potencia** y **Junta a cortante** tienen un selector arriba del formulario:

- **Cálculo manual:** evalúas **un** caso concreto (una cuerda y un material que tú eliges).
- **Diseño automático (iterativo):** la app **barre** muchas combinaciones (cuerda × material, o perno × grado) y te muestra una **tabla de candidatos** ordenada por diámetro, **recomendando el más pequeño** que cumple tu factor de seguridad objetivo. Es el flujo iterativo típico del libro.

En modo automático, los campos que la app elige por ti (tamaño/grado) se ocultan y solo defines la carga, las restricciones y el **factor de seguridad objetivo**.

---

## 5. Tornillo de potencia

**Datos de entrada:**
1. **Geometría de la rosca:** tipo (Acme α=14.5° o cuadrada α=0°), número de entradas, diámetro mayor y paso. Puedes cargar valores de tabla con la casilla *Cargar de tabla*.
2. **Carga axial F.**
3. **Fricción y collarín:** coeficiente de fricción de la rosca, filetes en contacto y, si aplica, diámetro y fricción del collarín.
4. **Material (opcional):** Sy para calcular el factor de seguridad contra el Von Mises del cuerpo.

**Resultados:** diámetros medios y de raíz, avance, ángulo de avance, torques TR/TL/Tc, eficiencia, autobloqueo, esfuerzos de Von Mises y esfuerzos del filete (aplastamiento, flexión, cortante).

**Modo automático:** barre todas las cuerdas Acme estándar (1/2″ … 2″) × materiales (1020, 1040, 4140, 304) y recomienda la cuerda más pequeña con n ≥ objetivo.

---

## 6. Junta a tensión

**Datos de entrada:**
1. **Geometría del perno:** estándar de rosca (ISO/UNC/UNF), designación, diámetro, paso y área de tensión At.
2. **Grado / clase:** elige el sistema (ISO clases 3.6…12.9 o SAE grados 1…8.2) y la clase. Se muestran Sp, Sy, Sut y Se.
3. **Longitud de agarre:** grip y reparto entre parte sin rosca (ld) y roscada (lt); o modo automático con la Tabla 8-7.
4. **Rigidez del paquete:** método **Cornwell FEA** (recomendado, da C directamente) o **Wileman** (km por material).
5. **Precarga y apriete:** tipo de unión (reutilizable 0.75·Fp / permanente 0.90·Fp / personalizado), precarga fija opcional y factor K del par.
6. **Carga externa:** estática o por fatiga (Goodman/Gerber/ASME-elíptica); carga por perno o total ÷ N pernos.
7. **Unión con empaque (opcional):** confinado o no confinado (con kg), y verificación de espaciado entre pernos.

**Resultados:** rigideces, constante C, precarga, factores de seguridad (np, n0, ny y nf en fatiga), par de apriete y, si aplica, resultados del empaque.

> **Nota:** elige primero el **Sistema** (ISO o SAE) y luego la **Clase/Grado**. Si cambias de sistema, debes volver a seleccionar la clase.

---

## 7. Junta a cortante

**Datos de entrada:**
1. **Patrón de pernos:** coordenadas (x, y) de cada perno; agrega o elimina pernos.
2. **Perno:** diámetro, área a cortante (At o πd²/4), cortante simple/doble y grado (Sp, Sy, Sut).
3. **Carga V:** magnitud, dirección y punto de aplicación (si no coincide con el centroide, hay momento).
4. **Placa:** espesor, ancho (activa la tensión en área neta) y propiedades Sy/Sut.

**Resultados:** centroide, momento, fuerza en el perno más cargado, factores por cortante, aplastamiento y área neta, y veredicto del criterio que gobierna.

**Modo automático:** barre tamaños de perno (ISO o UNC) × grados y recomienda el menor perno con n ≥ objetivo. Puedes elegir el área a cortante (At = roscas en el plano de corte, o πd²/4 = vástago).

---

## 8. Cómo leer los resultados

- **Veredicto:** tarjeta con el factor de seguridad gobernante y si el diseño es válido/marginal/inválido.
- **Parámetros confirmados:** los valores efectivamente usados.
- **Desarrollo de cálculos:** tabla con cada parámetro, su fórmula (en notación matemática) y su valor.
- **Tabla de diseño iterativo** (modo automático): candidatos ordenados; el recomendado va marcado con ★.
- **Dashboard — gráficos:** visualizaciones interactivas de la distribución de esfuerzos/cargas.
- **Exportar:** puedes generar un **PDF** del dashboard de resultados.

---

## 9. Consejos y advertencias

- Usa **punto (.)** como separador decimal, no coma.
- Completa todos los campos requeridos antes de calcular; el aviso flotante te dirá si falta alguno.
- En modo automático, el **factor de seguridad objetivo** es el que define cuál candidato se recomienda.
- Los resultados siguen las convenciones del libro (SI internamente; las entradas imperiales se convierten antes de calcular).
- Las advertencias (p. ej. "no autobloqueante", "espaciado no cumple") son informativas y no detienen el cálculo.

---

## 10. Referencias

1. Budynas, R. G. & Nisbett, J. K. *Diseño en Ingeniería Mecánica de Shigley*, 9.ª ed. McGraw-Hill, 2012. — §8 (Tornillos, sujetadores y diseño de uniones no permanentes).
2. Norton, R. L. *Diseño de Máquinas: Un Enfoque Integrado*, 4.ª ed. Pearson, 2011. — §11 (Tornillos y sujetadores), §11.8 (uniones con empaque).
3. Mott, R. L. *Diseño de Elementos de Máquinas*, 4.ª ed. Pearson. — Convenciones de unidades y esfuerzos admisibles.
