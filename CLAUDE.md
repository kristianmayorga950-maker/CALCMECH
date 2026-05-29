# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server at http://localhost:3000
npm run build      # TypeScript check + Vite production build
npm run preview    # Preview production build
npm test           # Run all tests once (Vitest)
npm run test:watch # Run tests in watch mode
```

Run a single test file:
```bash
npx vitest run tests/unit/powerScrew.test.ts
```

## Architecture

Single-page React 18 + TypeScript app. All calculations are offloaded to a **Web Worker** (`src/workers/calculations.worker.ts`) to keep the UI responsive.

### Data flow

1. User fills a form → `InputPanel` dispatches `UPDATE_*` action to `CalculatorContext`
2. User clicks "Calcular" → `calculate()` posts a message to the Worker
3. Worker instantiates the relevant calculator class and calls `.calculate()`
4. Worker posts results back → Context dispatches `SET_RESULTS` → `ResultsPanel` re-renders

**Design sweep ("Diseño automático") flow:** when `autoMode[tab]` is on (power/shear only), `calculate()` posts a `*_SWEEP` message instead. The worker calls the pure sweep function (`sweepPowerScrew` / `sweepShearJoint`), which loops the existing calculator over many thread × material/grade combos and ranks candidates. The worker has no loaded tables, so the context passes the resolved table arrays inside the payload. The response carries `kind: 'sweep'` → Context dispatches `SET_SWEEP` → `ResultsPanel` renders `DesignSweepTable`.

### State management

`CalculatorContext` (`src/context/CalculatorContext.tsx`) is the single source of truth. It uses `useReducer` with a flat `CalculatorState` that holds inputs, results, and validation errors for all three tabs simultaneously. Tab switching does not reset inputs or results. It also holds `autoMode` (per-tab design-sweep toggle), `sweepOptions` (shear standard + area mode), and the `powerSweep`/`shearSweep` results.

**Default state invariant:** `defaultState` must include all required fields for every calculator. Missing fields cause the worker to throw when the user clicks "Calcular" without touching the form. The `tensionInputs` default includes a full Cornwell `cornwellPlates` array; the default `grade` is set after tables load via `dispatch({ type: 'UPDATE_TENSION', inputs: { grade: g88 } })`.

### Calculation modules (`src/modules/`)

Each module is pure TypeScript (no React), structured as:
- `types.ts` — input/output interfaces
- `calculations.ts` — the `*Calculator` class plus exported pure functions used in tests
- `validation.ts` — field-level validation returning `{ field, message, severity }` arrays
- `design.ts` — *(powerScrew & shearJoint only)* the iterative-design sweep layer

The three modules are:
- `powerScrew` — ACME/square thread power screws (§8-1/§8-2): torques, efficiency, self-locking, Von Mises body stress, thread bearing/bending/shear
- `tensionJoint` — bolted joints in tension (§8-3 – §8-11): stiffness (Cornwell/Wileman), preload, Goodman fatigue, torque de apriete, optional gasket
- `shearJoint` — bolt groups in direct and eccentric shear (§8-12): bolt shear, plate bearing, net-area tension

**Design sweep (`design.ts`):** `sweepPowerScrew(base, threads, materials, targetN)` and `sweepShearJoint(base, threads, grades, targetN, areaMode)` are pure functions that reuse the `*Calculator` classes unchanged — they iterate the cartesian product (power: thread × material; shear: bolt × grade), compute each governing safety factor, sort candidates by diameter, and mark the **smallest viable** (`n >= targetN`) as `recommendedKey`. Tables are passed as arrays (not fetched) so the functions stay pure and run inside the worker. Tested in `tests/unit/{powerScrew,shearJoint}Design.test.ts`.

### Reference data (`public/data/`)

Thread and material tables are loaded at app startup via `loadThreadTables()` and `loadMaterialTables()` (singleton pattern, fetch from `/data/*.json`). The data is module-level singletons in `src/utils/threadTables.ts` and `src/utils/materialDatabase.ts`. Tests that exercise the full flow need these tables pre-loaded.

### UI rendering dependencies

- **Formulas** — rendered with KaTeX via `FormulaDisplay` (`src/components/common/FormulaDisplay.tsx`). Formula strings in `calculations` result maps use LaTeX syntax.
- **Charts** — Recharts is used in `StressChart` for graphing stress distributions.
- **PDF export** — `@react-pdf/renderer` is used in `ExportButtons`.
- **Animations** — `ScrollReveal` wraps result sections; entrance animations are CSS-only (`animate-fade-in-up`).

### Build chunking

`vite.config.ts` splits each calculator module and heavy vendor libs (recharts, katex) into separate chunks via `manualChunks`. The worker is bundled as an ES module (`worker: { format: 'es' }`).

### Path alias

`@/` maps to `src/` in both Vite and Vitest configs.

### Tests

Tests in `tests/unit/` target exported pure functions directly (no React, no DOM). They validate against example values from *Diseño en ingeniería mecánica de shigley, novena Ed.*. `tests/integration/fullFlow.test.ts` tests the end-to-end calculation pipeline by instantiating calculator classes directly.

All calculations and formulas should match the Mott textbook conventions (SI units internally; imperial inputs are converted before calculation).

# CLAUDE.md - Token Efficient Rules

1. Think before acting. Read existing files before writing code.
2. Be concise in output but thorough in reasoning.
3. Prefer editing over rewriting whole files.
4. Do not re-read files you have already read unless the file may have changed.
5. Test your code before declaring done.
6. No sycophantic openers or closing fluff.
7. Keep solutions simple and direct.
8. User instructions always override this file.


## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean

- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to 'tasks/todo.md' with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to 'tasks/todo.md'
6. **Capture Lessons**: Update 'tasks/lessons.md' after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.