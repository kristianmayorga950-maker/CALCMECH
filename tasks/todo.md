# Rediseño Tornillo de Potencia — Seguimiento

Plan: `C:\Users\USUARIO\.claude\plans\guiate-del-siguiente-prompt-hashed-bunny.md`
Alcance: SOLO la sección de tornillo de potencia. Modelos: Opus 5.5 y Sonnet 5.5 (nada de pago extra).

## Loop 1 — Metodología ✅ (revisado; decisiones incorporadas)
- [x] Leer §8-1, §8-2, §4-12/13 y §5-5 desde el PDF local
- [x] Verificar la Tabla 8-4 como imagen (símbolos ≤ y ≥)
- [x] Reproducir numéricamente el Ejemplo 8-1 (10 valores OK)
- [x] Resolver la numeración de Johnson (8-9 ≡ 4-46; errata "4-43" en la traducción)
- [x] `docs/power-screw/METODOLOGIA.md`: variables, ecuaciones, orígenes, grafo, ramas, supuestos

## Loop 2 — Arquitectura de la información ✅ (revisado; cálculo progresivo incorporado)
- [x] Prototipo interactivo del flujo: https://claude.ai/artifact/BCKqZoV4wu7AxsHJGM8uoE
- [x] Controles por dato, jerarquía de resultados, comparación con el flujo actual
- [x] v3: motor progresivo (reglas con alternativas, faltantes no intrusivos); probado con el ejercicio de 32 mm y con la capacidad con palanca

## Loop 3 — Skills y arquitectura ✅ (dirección C, cuaderno de ingeniería, elegida)
- [x] fast-check 3.23.2 (devDependency) + skill property-testing (revisada: solo instrucciones) en .claude/skills
- [x] engine/types.ts (contratos) y engine/units.ts (13 pruebas, propiedades verificadas plantando errores)
- [x] docs/power-screw/ARQUITECTURA.md (aislamiento, motor, unidades, validación, pruebas)
- [x] 3 direcciones visuales: https://claude.ai/artifact/2y1eXToFHBPGELCso5pC7M
- [x] Prototipo del flujo v4 con notación corregida

## Loop 4 — Entradas adaptativas ✅ (revisado)
- [x] data/tables.ts: Acme, materiales A-20 (verificados en el PDF), Tablas 8-4, 8-5, 8-6 y 4-2
- [x] engine: vars, validate, format, solver progresivo (alternativas, faltantes mínimos, bloqueos explicados, sugerencias), reglas de geometría
- [x] state: reducer puro (catálogo, material, pares de fricción, unidades por campo) + usePowerScrew
- [x] UI (Sonnet): riel, traza y libro de verificaciones con estilo cuaderno; App.tsx con cambio mínimo
- [x] Corregido tras verificar en el navegador: subrayado del resultado, riel angosto, selectores, desplazamiento en móvil
- [x] Bug real hallado por propiedades: valores finitos que se vuelven infinitos al convertir (fijado como ejemplo)
- [x] 164/164 pruebas, tsc y build OK
## Loop 5 — Motor ✅ (revisado)
- [x] Prueba del ejercicio 32 × 4 escrita primero (roja) → 10 valores reproducidos
- [x] Reglas: pares, apoyo, arranque, eficiencias, transmisión (directa/palanca/reductor) e inversas (capacidad, P, r, T_m), avance máximo, cuerpo, raíz (0.38F, von Mises 3D, principales, τ máx), pandeo Euler/Johnson, desgaste con p_b de tabla (conservador/interpolado), cinemática y potencia
- [x] 8 verificaciones con criterio, calculado, requerido y explicación
- [x] Dimensionamiento con n_t mínimo por desgaste
- [x] Propiedades verificadas plantando errores (capacidad, T_L, Johnson, recomendación)
- [x] Verificado en la app: traza completa del ejercicio y verificaciones correctas
### Ajustes pedidos tras el Loop 5
- [x] KaTeX del componente compartido integrado a main (Tensión: 17 fórmulas, 0 en código)
- [x] Accionamiento manual (opción A): fila "baja velocidad" de la Tabla 8-4 sin pedir N; marcado por defecto con palanca; si se da N manda la velocidad
- [x] Barra lateral ocultable (App.tsx, pedido explícito del usuario; afecta a toda la app), estado recordado en localStorage

## Loop 6 — Resultados y visualización ✅ (revisado)
- [x] engine/summary.ts: utilización, veredicto, criterio que gobierna, resultados destacados por objetivo, curva e(λ) (probado: coincide con el motor; frontera de autobloqueo con e < 0.5; el apoyo siempre baja e)
- [x] Paleta de gráficos validada con el script de dataviz sobre las superficies del cuaderno (claro con etiquetas visibles obligatorias)
- [x] UI (Sonnet): fila Variables, resumen con resultado buscado y veredicto, tabla de dimensionamiento con "usar el tamaño recomendado", 4 gráficos (par, e–λ, utilización, reparto en la tuerca)
- [x] Corregido tras verificar: botón invisible, cota de partida, rosca que cambiaba al aplicar el tamaño (keepThread), texto del gráfico pequeño
- [x] 345 pruebas, tsc y build OK; verificado en claro, oscuro y móvil
## Loop 7 — Ejemplos, casos límite y proyecto ✅ (revisado)
- [x] Ejemplo 1 (collarín, extiende el ejercicio de 32 × 4) y Ejemplo 2 (gato con palanca, capacidad): 14 pruebas
- [x] 18 pruebas de casos límite: faltantes, inválidos, rosca trabada, cambio de configuración, tensión, desvinculación de tablas, reiniciar y cargar
- [x] Mejora hallada por las pruebas: un pendiente explica por qué falló la alternativa por datos de entrada (p. ej. rosca trabada)
- [x] persistence.ts: guardar/abrir/duplicar/borrar (localStorage inyectado), exportar/importar JSON validado, informe Markdown; ida y vuelta probada por propiedades
- [x] Menú "Proyecto" (Sonnet) verificado en el navegador: ejemplos con planteamiento, guardar, copia, abrir, reiniciar; panel cabe en 375 px
- [x] Corregido: planteamientos con "d_c" y "f_c" visibles → reescritos; prueba que lo impide
- [x] 386 pruebas, tsc y build OK
- [x] Interpretación de cada gráfico, plegada por defecto ("Qué significa"), calculada con los datos; engine/interpret.ts + 5 pruebas
## Loop 8 — Refinamiento y cierre ✅ (esperando decisión sobre el código viejo)
- [x] Auditoría de accesibilidad en el navegador (claro y oscuro): 0 campos sin etiqueta, 0 botones sin nombre; contraste sin fallos reales
- [x] Rendimiento: cálculo 0.4 ms, dimensionamiento 4.3 ms
- [x] Inventario del código viejo y sus dependencias (propuesta de limpieza, sin borrar nada)
- [x] docs/power-screw/README.md: qué hace, ramas, supuestos, validación, 137 pruebas, skills y modelos, comparación
- [ ] Limpieza del código viejo (pendiente de aprobación)
- [ ] Manual, PDF y CLAUDE.md desactualizados (pendiente de aprobación)

## Del plano al cálculo — paso 2 (hecho, 2026-10-02)
- [x] Esquema del sistema en vivo arriba de la traza (plegable, recordado), con «Ver en grande» (diálogo nativo) y viewBox recortado al dibujo
- [x] Miniaturas en «Abrir guardado»: mecanismo, sello del veredicto, criterio que gobierna con %, F y d
- [x] Autoguardado de la sesión (`calcmech-power-screw:session`, 0.5 s + al salir/cerrar), se restaura al volver; «Reiniciar» la borra
- [x] Pruebas: schematic.test.ts (9) y session.test.ts (6); 256 en verde
- [x] Hallazgo de las pruebas de propiedades: `-0` no volvía igual tras guardar → el reductor lo normaliza a 0 (prueba fijada)
- [x] Hallazgo: la carga de trabajo derivada es `Fw` (modo capacidad), no `F` → la miniatura y las cotas usan `Fw ?? F`

## Del plano al cálculo — paso 3 (hecho, 2026-10-02)
- [x] Portada nueva en src/components/landing/ (plano de conjunto del gato, globos 1–3, lista de piezas, cajetín con logo y créditos, trazado inicial único, cianotipo/plano según el tema)
- [x] «Continuar» con la sesión autoguardada y «Proyectos guardados» con miniatura; abrir un proyecto conserva su id (Guardar lo sobrescribe); confirma si hay sesión sin guardar
- [x] Barra superior como cajetín y barra lateral como lista de piezas; View Transitions con flushSync (pieza-N y cajetín compartidos), sin animación con reducir movimiento
- [x] Borrados: LandingPage.tsx (carrusel Unsplash), Header.tsx (sin uso) y su CSS (.slide-image, .hero-overlay, .calc-card, .accent-bar); título de pestaña «CALCMECH · Elementos roscados»
- [x] Verificado: claro/oscuro, 375 px sin desborde, teclado (Enter sobre una pieza), Tensión y Cortante calculan igual, consola limpia; 259 pruebas, build OK

## Del plano al cálculo — paso 4 (hecho, 2026-10-03)
- [x] Manual en la app (UserManual.tsx): portada, controles, tornillo nuevo (configurar, cálculo progresivo, qué obtienes, proyectos y autoguardado), diseño automático solo en cortante; sin emojis (lucide)
- [x] docs/MANUAL_DE_USO.md y docs/CONTENIDO_APP.md reescritos
- [x] docs/build_pdfs.py con tildes, contenido nuevo y URL real; PDF regenerados (manual 8 pág., capacidades 4) y revisados como imagen
- [x] CLAUDE.md: arquitectura actual (feature del tornillo, portada, transiciones, autoguardado, pruebas, documentos)
