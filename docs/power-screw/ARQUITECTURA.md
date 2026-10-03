# Tornillo de potencia — Arquitectura (Loop 3)

Complementa `METODOLOGIA.md` (qué se calcula) con el **cómo** se construye.

## 1. Aislamiento

Todo el código nuevo vive en `src/features/powerScrew/`. El único archivo compartido que se tocará es `src/App.tsx`: cuando la pestaña activa sea `power`, renderiza `<PowerScrewWorkspace/>` en lugar de las columnas `InputPanel` / `ResultsPanel`.

No se modifican `CalculatorContext`, el worker, `ResultsPanel` ni las juntas. De `CalculatorContext` solo se **lee** `unitSystem`, para elegir las unidades por defecto.

```
src/features/powerScrew/
  engine/            TS puro, sin React — verificable por separado
    types.ts         contratos (✔ Loop 3)
    units.ts         unidades y conversiones (✔ Loop 3, probado)
    vars.ts          catálogo de variables: símbolo LaTeX, nombre, dimensión
    rules/           reglas por etapa: geometry, torque, efficiency, locking, body, thread, buckling, wear, kinematics
    transmission/    direct.ts, lever.ts, reducer.ts → TransmissionStage (campos + reglas + verificaciones)
    checks.ts        verificaciones
    solver.ts        punto fijo, faltantes mínimos, sugerencias, bloqueos de dominio
    sizing.ts        barrido del catálogo Acme o de una serie d/p del usuario
    validate.ts      validación de entradas (errores y avisos con explicación)
  data/              acme.ts, friction.ts (Tabla 8-5), collarFriction.ts (8-6), bearingPressure.ts (8-4), endConditions.ts (4-2), materials.ts
  state/             useReducer local, persistencia (localStorage con try/catch) e importar/exportar JSON
  ui/                Workspace, ProblemRail, TraceStep, ChecksLedger, charts/, schematics/
  examples/          ejemplo 1 (collarín), ejemplo 2 (palanca)
tests/unit/powerScrewEngine/
```

## 2. Motor

- **Reglas con alternativas.** Cada `Rule` calcula un `target` a partir de `inputs`, bajo una condición `applies(cfg)`. Varias reglas con el mismo `target` son alternativas en orden de prioridad (por ejemplo, `Fw` ← `F` dada | despejada de lo aplicado en la entrada).
- **Solver de punto fijo.** Repite hasta que no cambie nada; un valor que escribió el usuario nunca se sobrescribe.
- **Tres estados por resultado:**
  - `StepResult`: calculado, con ecuación general, sustitución y valor;
  - `PendingResult`: le faltan entradas, y se da el **mínimo** entre alternativas, expandido hasta datos del usuario;
  - `BlockedResult`: dominio inválido, por ejemplo π d_m − f l sec α ≤ 0, con una explicación accionable.
- **Sugerencias.** Se cuenta cuántos pendientes desbloquea cada entrada faltante.
- **Datos de más.** Nunca se descartan: las variables de entrada (`Tin`, `P`, `r`…) son distintas de las requeridas (`Tinreq`, `Preq`…), y una verificación las compara.
- **Mecanismos extensibles.** Un `TransmissionStage` aporta sus campos, reglas y verificaciones; agregar uno no toca el solver.
- **`origin` y `ref`** son solo para auditoría. **La UI no los muestra.**

## 3. Unidades

- **Base interna coherente:** mm, N, N·mm, MPa (también para E), rad, rpm, mm/s, W.
- **Entrada:** cada campo tiene su selector de unidad. Por defecto se usan las unidades del sistema global de la app (SI o Imperial). Al convertir a base se genera una `ConversionNote`, que la traza muestra ("1.25 in → 31.75 mm").
- **Resultados:** se muestran en las unidades preferidas por dimensión; la sustitución usa las unidades mostradas.
- **Etiquetas de unidades** en LaTeX con `\mathrm{N\cdot mm}`, nunca `\text{N·mm}` (ver lecciones).
- **Pruebas:** valores conocidos más propiedades de ida y vuelta y linealidad (fast-check), verificadas plantando errores.

## 4. Validación

| Nivel | Qué atrapa | Cómo se muestra |
|---|---|---|
| Entrada (`validate.ts`) | vacío, no numérico, ≤ 0 donde no aplica, n no entero, f fuera del rango de la tabla (aviso), p ≥ d | junto al campo, con la causa y el arreglo |
| Dominio de regla (`RuleOutcome.ok = false`) | denominadores ≤ 0, raíces de negativos, esbeltez sin sentido | el paso aparece "bloqueado" con la explicación; lo que depende de él queda pendiente |
| Verificación (`CheckDef`) | criterios de diseño: autobloqueo, fluencia, pandeo, desgaste, entrada suficiente | libro de verificaciones: criterio, calculado, requerido, estado y explicación |

Ningún error se traga en silencio. El motor no lanza excepciones: todo se convierte en resultado.

## 5. Pruebas

1. **Ecuaciones:** ejemplos con los valores del ejercicio de rosca cuadrada de 32 mm (los 10 valores, con la tolerancia de redondeo del libro).
2. **Propiedades (fast-check):**
   - T_R ≥ T_0;
   - 0 < e < 1;
   - autobloqueo ⇔ T_L > 0;
   - capacidad(analizar(F)) = F;
   - T_R con Acme > T_R con rosca cuadrada;
   - monotonía: más carga, más par.

   Cada propiedad se valida plantando un error.
3. **Solver:**
   - lo progresivo (d y p → d_r);
   - los faltantes mínimos;
   - los datos de más → verificación;
   - el cambio de configuración;
   - el reinicio y la carga.
4. **No regresión:** las pruebas existentes de tensión y cortante se ejecutan sin cambios.

## 6. Rendimiento

El motor evalúa unas 60 reglas, y un barrido de dimensionamiento cubre 9 tamaños × alternativas. Corre en el hilo principal con `useMemo`, en menos de 1 ms, y se recalcula en vivo sin botón. No usa el worker compartido.

## 7. Visualización (Loop 6)

Solo cuatro gráficos, cada uno responde una pregunta:
1. ¿A dónde se va el par? Barra apilada T_0 | fricción de rosca | apoyo.
2. ¿Cuánta eficiencia se gana o pierde con el autobloqueo? Curva e vs λ con el punto de diseño y la frontera de autobloqueo.
3. ¿Qué criterio gobierna? Utilización (demanda / capacidad) por verificación.
4. ¿Por qué 0.38F? Reparto de carga en los filetes de la tuerca.

En dimensionamiento se usa una tabla de candidatos, no un gráfico.
