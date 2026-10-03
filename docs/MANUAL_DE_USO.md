# Manual de uso — CALCMECH

**Calculadoras de elementos roscados**
Basada en Shigley, *Diseño en Ingeniería Mecánica* (9.ª ed.) y Norton, *Diseño de Máquinas* (4.ª ed.).
Diseño de Máquinas II · Escuela de Ingeniería Mecánica · UIS · 2026-1

App en línea: <https://kristianmayorga950-maker.github.io/CALCMECH/>

---

## 1. ¿Qué es CALCMECH?

Tres calculadoras que muestran el procedimiento completo de cada cálculo: ecuación, sustitución y resultado.

| Pieza | Calculadora | Qué resuelve |
|---|---|---|
| 1 | **Tornillo de potencia** | Pares de subir y bajar, eficiencia, autobloqueo, esfuerzos en el cuerpo y en la rosca, pandeo, desgaste de la tuerca, velocidad y potencia. También dimensiona. |
| 2 | **Pernos a tensión** | Rigideces, constante de la junta, precarga, factores de seguridad, fatiga, par de apriete y empaques. |
| 3 | **Pernos a cortante** | Grupos de pernos con carga directa y excéntrica, aplastamiento y tensión en el área neta. |

Todo se calcula en tu navegador; no se envía nada a un servidor.

---

## 2. La portada

La portada es un **plano de conjunto** de un gato de tornillo. Cada pieza numerada es una calculadora:

1. el tornillo con su tuerca, collarín y palanca;
2. los pernos que unen la base al bastidor;
3. la ménsula guía, sujeta con un grupo de cuatro pernos.

- Para entrar, toca la pieza en el dibujo, su globo numerado o su fila en la **lista de piezas**. Con el teclado: Tab hasta la pieza y Enter.
- **Continuar** abre lo último que hiciste en el tornillo de potencia, tal como lo dejaste.
- **Proyectos guardados** muestra cada proyecto con su mecanismo dibujado, un sello con el veredicto (cumple, con observaciones, no cumple o incompleto), el criterio que gobierna con su porcentaje, y los valores de F y d.
- El **cajetín** lleva los datos del curso. Arriba están el manual, los dos PDF y el cambio de tema. El tema claro se ve como plano y el oscuro como cianotipo.

---

## 3. Controles generales

- **Cajetín (barra superior):** muestra la calculadora abierta y su número de pieza, las unidades **SI / Imperial** y el **tema** claro u oscuro.
- **Lista de piezas (barra lateral):** cambia de calculadora. El botón de arriba la oculta para ganar espacio. Abajo están el manual y el regreso a la portada.
- En el celular, la barra lateral se reemplaza por los botones 1, 2 y 3 del cajetín y una flecha para volver a la portada.
- Usa **punto (.)** como separador decimal.

---

## 4. Tornillo de potencia

### 4.1 Configurar el sistema

En la columna izquierda eliges el sistema:

| Opción | Valores |
|---|---|
| Transmisión | Par directo, Palanca (una o dos manos) o Reductor (motor con sinfín y corona) |
| Accionamiento | Manual (gato, prensa) o Con velocidad (pide la velocidad de giro) |
| Forma de rosca | Cuadrada o Acme |
| Apoyo de empuje | Ninguno, Collarín o Rodamiento |
| Par en el cuerpo | Total (rosca + apoyo) o solo el de la rosca |
| Carga | Compresión o Tensión |
| Objetivo | Analizar, Capacidad, Accionamiento, Dimensionar o Avance |

El **objetivo** solo orienta lo que se resalta:

- **Analizar:** tienes el tornillo y la carga; se calculan pares, eficiencia y esfuerzos.
- **Capacidad:** tienes el par o la fuerza disponible; se despeja la carga que se puede mover.
- **Accionamiento:** tienes la carga; se calcula el par o la fuerza que hay que aplicar.
- **Dimensionar:** tienes los límites de resistencia; se busca el diámetro necesario.
- **Avance:** se revisan el avance, el autobloqueo y la velocidad.

### 4.2 Cálculo progresivo

No hay botón de calcular ni campos obligatorios. Cada dato que escribes desbloquea los pasos que dependen de él, y el resultado se actualiza en vivo.

- Arriba de la traza aparece el **próximo dato útil**: el dato que más resultados desbloquea.
- Cada etapa dice qué le falta. Por ejemplo, con el diámetro y el paso ya se obtienen el diámetro medio y el de raíz.
- Los datos pueden salir de las tablas: tamaños Acme de ½ a 2 in, aceros AISI 1010 a 1095, fricción de la rosca y del collarín, y condición de extremos para el pandeo. El valor queda marcado con la tabla de la que salió. Si lo cambias a mano, deja de estar ligado a la tabla.
- Puedes escribir cada dato en la unidad que prefieras; la app convierte antes de calcular.

### 4.3 Qué obtienes

- **Esquema del sistema:** dibujo del mecanismo elegido (rosca, entrada, apoyo y sentido de la carga). Las cotas ya calculadas llevan su valor; las punteadas esperan su dato. **Ver en grande** lo amplía.
- **Resultado buscado:** el valor principal según el objetivo.
- **Cálculo paso a paso:** cada resultado con su ecuación, los valores usados, la sustitución y el resultado con unidades, agrupado por etapas. Las etapas son: geometría, carga, pares, transmisión, eficiencia, autobloqueo, esfuerzos en el cuerpo y en la rosca, pandeo, desgaste, y cinemática y potencia.
- **Estado del diseño** (columna derecha): las verificaciones que aplican a tu caso, con su porcentaje de utilización y el criterio que gobierna:
  - ecuación de par válida;
  - autobloqueo;
  - retención con el apoyo;
  - fluencia en la raíz del filete;
  - fluencia en el cuerpo;
  - pandeo;
  - desgaste de la rosca;
  - entrada suficiente.
- **Gráficos:**
  - reparto del par;
  - eficiencia según el ángulo de avance;
  - utilización por criterio;
  - carga por filete de la tuerca.

  Cada gráfico tiene un apartado plegado **Qué significa**.
- **Dimensionamiento** (objetivo Dimensionar): recorre el catálogo Acme y propone el menor tamaño que cumple. Puedes aplicarlo con un clic y conservar la forma de rosca que elegiste.

### 4.4 Proyectos, ejemplos y autoguardado

El menú **Proyecto** permite:

- cargar los ejemplos resueltos (tornillo con collarín y gato con palanca), con su planteamiento;
- **Guardar** o **Guardar una copia** con un nombre;
- **Abrir guardado**: cada proyecto aparece con su miniatura;
- exportar el proyecto (.json) o un informe con datos, resultados y verificaciones (.md);
- importar un proyecto (.json); antes de cargarlo, la app revisa cada dato;
- **Reiniciar** todos los datos.

**Autoguardado:** lo que tienes en pantalla se guarda solo, medio segundo después de cada cambio y al salir. Si vuelves a la portada o recargas la página, al regresar está igual, y la portada lo ofrece en **Continuar**. **Reiniciar** borra esa sesión, pero no toca tus proyectos guardados.

Los proyectos se guardan en este navegador. Para llevarlos a otro equipo, exporta el .json e impórtalo allá.

---

## 5. Pernos a tensión

**Datos de entrada:**
1. **Geometría del perno:** estándar de rosca (ISO, UNC o UNF), designación, diámetro, paso y área de tensión At.
2. **Grado o clase:** elige el sistema (ISO clases 3.6 a 12.9, o SAE grados 1 a 8.2) y la clase. Se muestran Sp, Sy, Sut y Se.
3. **Longitud de agarre:** agarre total y su reparto entre la parte sin rosca y la roscada, o cálculo automático.
4. **Rigidez del paquete:** método **Cornwell** (recomendado) o **Wileman**.
5. **Precarga y apriete:** unión reutilizable, permanente o personalizada; precarga fija opcional y factor K del par.
6. **Carga externa:** estática o por fatiga (Goodman, Gerber o ASME elíptica); carga por perno, o total dividida entre el número de pernos.
7. **Unión con empaque (opcional):** confinado o no confinado, con verificación del espaciado entre pernos.

Presiona **Calcular** para ver los resultados: rigideces, constante C, precarga, factores de seguridad (np, n0, ny y, en fatiga, nf), par de apriete y, si aplica, el empaque.

> Elige primero el **sistema** (ISO o SAE) y luego la **clase**. Si cambias de sistema, vuelve a elegir la clase.

---

## 6. Pernos a cortante

**Datos de entrada:**
1. **Patrón de pernos:** coordenadas (x, y) de cada perno; puedes agregar o quitar pernos.
2. **Perno:** diámetro, área a cortante, cortante simple o doble, y su resistencia.
3. **Carga V:** magnitud, dirección y punto de aplicación. Si no pasa por el centroide, hay momento.
4. **Placa:** espesor, ancho (activa la tensión en el área neta) y resistencia.

Presiona **Calcular** para ver el centroide, el momento, la fuerza en el perno más cargado, los factores por cortante, aplastamiento y área neta, y el veredicto.

**Diseño automático:** recorre tamaños de perno (ISO o UNC) y grados, y recomienda el menor perno que cumple el factor objetivo; va marcado con una estrella. Puedes elegir el área a cortante: la de las roscas o la del vástago.

---

## 7. Cómo leer los resultados de las juntas

- **Veredicto:** tarjeta con el factor de seguridad que gobierna y si el diseño es válido, marginal o inválido.
- **Parámetros confirmados:** los valores que efectivamente se usaron.
- **Desarrollo de cálculos:** cada parámetro con su fórmula y su valor.
- **Dashboard:** gráficos de esfuerzos y cargas, con exportación a PDF.

---

## 8. Consejos

- Las advertencias (por ejemplo, «no autobloqueante» o «el espaciado no cumple») informan; no detienen el cálculo.
- En el tornillo de potencia, si un resultado no aparece, mira qué dato pide su etapa o el próximo dato útil.
- Internamente todo se calcula en SI; las entradas imperiales se convierten antes de calcular.

---

## 9. Referencias

1. Budynas, R. G. y Nisbett, J. K. *Diseño en Ingeniería Mecánica de Shigley*, 9.ª ed. McGraw-Hill, 2012. Capítulo 8: tornillos, sujetadores y diseño de uniones no permanentes.
2. Norton, R. L. *Diseño de Máquinas: Un Enfoque Integrado*, 4.ª ed. Pearson, 2011. Capítulo 11: tornillos y sujetadores.
3. Mott, R. L. *Diseño de Elementos de Máquinas*, 4.ª ed. Pearson. Convenciones de unidades y esfuerzos admisibles.
