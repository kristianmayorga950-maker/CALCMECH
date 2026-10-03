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
npx vitest run tests/unit/powerScrewEngine/solver.test.ts
```

Run the whole suite with `npx vitest run --dir tests` (plain `npx vitest run` also picks up copies inside `.claude/worktrees/`).

## Architecture

Single-page React 18 + TypeScript app with three calculators ("pieces" 1–3 of the landing's assembly drawing):

| Piece | Tab id | Where | How it computes |
|---|---|---|---|
| 1 Tornillo de potencia | `power` | `src/features/powerScrew/` (self-contained feature) | Live, on the main thread, via a progressive rule engine (no "Calcular" button) |
| 2 Pernos a tensión | `tension` | `src/modules/tensionJoint/` + `components/InputPanel`/`ResultsPanel` | "Calcular" → Web Worker |
| 3 Pernos a cortante | `shear` | `src/modules/shearJoint/` + same panels | "Calcular" → Web Worker (manual or design sweep) |

### App shell (`src/App.tsx`) and landing (`src/components/landing/`)

- `view: 'home' | 'calculator'`. Home renders `Landing`: an SVG assembly drawing of a screw jack (`assembly.ts`, pure string; parts are `.part[data-part]` groups handled by event delegation), the parts list (`parts.ts` is the single source of names/order for landing **and** sidebar), the title block (cajetín), "Continuar" (power-screw autosaved session) and saved projects with thumbnails.
- In calculator view the top bar is drawn as a cajetín and the sidebar as the parts list (collapsible, `fc-sidebar-collapsed` in localStorage).
- Landing ↔ calculator uses the View Transitions API: `withTransition()` wraps the state change in `document.startViewTransition(() => flushSync(update))`; shared `view-transition-name`s are `pieza-N` (BOM row ↔ sidebar item) and `cajetin`. Falls back to an instant change without the API or with `prefers-reduced-motion`.
- Opening a saved project from the landing writes it into the session slot (with its `projectId`) and enters `power`; the workspace restores from the session.

### Power screw feature (`src/features/powerScrew/`)

- `engine/` — pure TS, no React. `solve(ENGINE, cfg, entered, { extras })` runs a rule graph (`rules/*.ts`: geometry, torque/transmission, stress/buckling/wear/kinematics) to a fixed point over whatever inputs exist, choosing among alternative rules, and returns `values` (base units: mm, N, N·mm, MPa, rad), `steps` (general LaTeX → substitution → result), `pending`/`blocked` with reasons, `checks` (`checks.ts`) and `suggestions` (next most useful input). `sizing.ts` sweeps the Acme catalog; `summary.ts` computes utilization/verdict; `interpret.ts` the chart explanations. Table-sourced hidden inputs (`fMin`, `fcStart`, `nutCode`) come from `tableExtras()`.
- `data/tables.ts` — Acme ½–2 in, AISI 1010–1095 steels, thread/collar friction, bearing pressure, end conditions, nut load shares.
- `state/` — `problemState.ts` reducer (config, values with per-field units, table selections), `usePowerScrew.ts` (live `solve` + sizing), `persistence.ts` (validated serialize/parse, project library in localStorage, Markdown report), `session.ts` (autosave slot `calcmech-power-screw:session`, 0.5 s debounce + flush on unmount/`pagehide`; empty state clears it; carries `exampleId`/`projectId`).
- `ui/` — `PowerScrewWorkspace` (rail · trace · checks ledger), `schematic/` (`schematic.ts` parametric SVG of the chosen system as a string, `fromState.ts` state → drawing input and project snapshot, `SystemSchematic`/`ProjectThumbnail`), charts, `ProjectMenu`. Styles are scoped under `.ps-root` in `powerScrew.css`.
- Docs: `docs/power-screw/{METODOLOGIA,ARQUITECTURA,README}.md`.

### Joints data flow (tension / shear)

1. User fills a form → `InputPanel` dispatches `UPDATE_*` to `CalculatorContext`
2. "Calcular" → `calculate()` posts a message to the Worker (`src/workers/calculations.worker.ts`)
3. Worker runs the `*Calculator` class → posts results → `SET_RESULTS` → `ResultsPanel`

**Design sweep (shear only):** with `autoMode.shear` on, `calculate()` posts `SHEAR_JOINT_SWEEP`; the worker calls the pure `sweepShearJoint(base, threads, grades, targetN, areaMode)` (`src/modules/shearJoint/design.ts`), which reuses the calculator over bolt × grade, sorts by diameter and marks the smallest viable as `recommendedKey`. Tables travel in the payload (the worker has none loaded). Response `kind: 'sweep'` → `SET_SWEEP` → `DesignSweepTable`.

### State management (joints)

`CalculatorContext` holds `activeTab`, `unitSystem`, tension/shear inputs and results, `autoMode` (shear), `sweepOptions` and `shearSweep`. The power screw keeps its own state (above); it only reads `unitSystem`.

**Default state invariant:** `defaultState` must include all required fields for each joint calculator, or the worker throws when "Calcular" is pressed on an untouched form. `tensionInputs` includes a full Cornwell `cornwellPlates` array; the default `grade` is set after tables load via `dispatch({ type: 'UPDATE_TENSION', inputs: { grade: g88 } })`.

### Joint modules (`src/modules/`)

Pure TypeScript: `types.ts`, `calculations.ts` (`*Calculator` + exported pure functions), `validation.ts`, and `design.ts` (shear only).
- `tensionJoint` — §8-3 – §8-11: stiffness (Cornwell/Wileman), preload, fatigue, tightening torque, optional gasket
- `shearJoint` — §8-12: bolt shear, plate bearing, net-area tension

### Reference data (`public/data/`)

Joint thread/material tables load at startup via `loadThreadTables()` / `loadMaterialTables()` (singletons in `src/utils/threadTables.ts`, `src/utils/materialDatabase.ts`), fetched with `import.meta.env.BASE_URL`. The power screw's tables are TypeScript (`features/powerScrew/data/tables.ts`).

### UI rendering dependencies

- **Formulas** — KaTeX: `FormulaDisplay` for joints, `features/powerScrew/ui/Tex.tsx` for the power screw. Use `\mathrm{N\cdot mm}` style units in LaTeX.
- **Charts** — Recharts (`StressChart`, power-screw charts).
- **PDF export** — `@react-pdf/renderer` in `ExportButtons` (joints).
- **Icons** — lucide-react everywhere; no emojis in the UI.
- **Rule:** equation numbers and book names stay in internal metadata (`ref`/`origin`) and docs, never in the visible calculation trace.

### Build chunking

`vite.config.ts` `manualChunks`: `power-screw` (engine), `tension-joint`, `shear-joint`, `vendor-charts`, `vendor-katex`, `vendor-canvas`. `PowerScrewWorkspace` is lazy-loaded (the landing prefetches it). The worker is bundled as an ES module.

### Path alias

`@/` maps to `src/` in both Vite and Vitest configs.

### Tests

- `tests/unit/powerScrewEngine/` — engine, solver, units, sizing, persistence, session, schematic, examples (Shigley Example 8-1 reproduced), with fast-check property tests (`generators.ts`).
- `tests/unit/landing.test.ts` — assembly drawing contract (3 focusable named parts, unique prefixed ids).
- Joint unit tests and `tests/integration/fullFlow.test.ts` (all three calculators end to end).

Pure functions only (no React, no DOM). Values are validated against *Diseño en ingeniería mecánica de shigley, novena Ed.*.

All calculations and formulas should match the Mott textbook conventions (SI units internally; imperial inputs are converted before calculation).

### User docs

`docs/MANUAL_DE_USO.md`, `docs/CONTENIDO_APP.md`, the in-app `src/components/UserManual.tsx`, and the PDFs in `public/` generated by `python docs/build_pdfs.py` (reportlab). Keep the four in sync when features change.

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