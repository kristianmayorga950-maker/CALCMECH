# Calculadora de Tornillos — Mott

Herramienta web interactiva para cálculo de tornillos de potencia, tornillos sujetadores y pernos en cortante. Basada en **Robert L. Mott, "Diseño de Máquinas", 4ta Edición**.

## Instalación

```bash
npm install
npm run dev          # Servidor de desarrollo en http://localhost:3000
npm run build        # Build de producción
npm test             # Ejecutar tests unitarios
```

## Módulos

| Módulo | Cálculos |
|--------|----------|
| Tornillo de Potencia | Torques, pandeo, Von Mises, eficiencia, fuerza manual, motor |
| Tornillo Sujetador  | Rigidez, precarga, fatiga (Goodman), torque de apriete |
| Pernos en Cortante  | Cortante directo y excéntrico, grupo de pernos |

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Recharts (gráficas)
- KaTeX (fórmulas)
- Web Worker (cálculos en background)
- Vitest (tests)

## Estructura

```
src/
├── modules/          # Lógica de cálculo (puras TypeScript)
├── components/       # UI React
├── context/          # Estado global + Web Worker
├── utils/            # Conversión de unidades, tablas, BD materiales
└── workers/          # Web Worker de cálculo
tests/
├── unit/             # Tests contra ejemplos del libro Mott
└── integration/      # Flujo completo end-to-end
public/data/          # Tablas JSON: UNC, ISO, ACME, SAE, ISO materiales
```
