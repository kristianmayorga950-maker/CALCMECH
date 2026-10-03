/**
 * Guardar, cargar, duplicar, importar y exportar proyectos del tornillo de potencia.
 * Puro: el almacenamiento se inyecta (localStorage en la app, un mapa en las pruebas).
 * Al leer, todo se valida: nada de un archivo importado entra al estado sin revisar.
 */

import type { EngineResult, EnteredInputs, InputId, ProblemConfig } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine';
import { INPUT_BY_ID, varLabel, varDim } from '../engine/vars';
import { BASE_UNIT, getUnit, fromBase, DEFAULT_UNITS } from '../engine/units';
import { fmtNum } from '../engine/format';
import { defaultUnits, type ProblemState, type Selections, type UnitSystem } from './problemState';
import { ACME_SIZES, COLLAR_FRICTION, END_CONDITIONS, SCREW_MATERIALS, THREAD_FRICTION } from '../data/tables';

export const APP_TAG = 'calcmech-power-screw';
export const FORMAT_VERSION = 1;
const LIB_KEY = `${APP_TAG}:projects`;

export interface SavedProject { id: string; name: string; savedAt: string; state: ProblemState }

export type ParseResult = { ok: true; name: string; state: ProblemState } | { ok: false; error: string };

// ── Serialización ────────────────────────────────────────────────────────────

export function serialize(state: ProblemState, name: string, now = new Date()): string {
  return JSON.stringify({
    app: APP_TAG, version: FORMAT_VERSION, name, savedAt: now.toISOString(),
    state: { cfg: state.cfg, entered: state.entered, unitPref: state.unitPref, selections: state.selections },
  }, null, 2);
}

const ENUMS: { [K in keyof ProblemConfig]?: readonly unknown[] } = {
  thread: ['square', 'acme'], transmission: ['direct', 'lever', 'reducer'], thrust: ['none', 'collar', 'bearing'],
  load: ['compression', 'tension'], goal: ['analyze', 'capacity', 'drive', 'size', 'lead'],
  bodyTorque: ['total', 'threadOnly'], leverHands: [1, 2], pbPolicy: ['conservative', 'interpolate'],
  manualDrive: [true, false], requireSelfLock: [true, false],
};

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Lee y valida un proyecto. Campos desconocidos se descartan; los que faltan toman su valor por defecto. */
export function parse(text: string, system: UnitSystem = 'SI'): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'El archivo no es un JSON válido.' }; }
  if (!isObj(raw) || raw.app !== APP_TAG) return { ok: false, error: 'El archivo no es un proyecto de tornillo de potencia de esta aplicación.' };
  if (typeof raw.version !== 'number' || raw.version > FORMAT_VERSION) {
    return { ok: false, error: 'El proyecto fue guardado con una versión más nueva de la aplicación.' };
  }
  const st = raw.state;
  if (!isObj(st)) return { ok: false, error: 'El proyecto no trae datos.' };

  // Configuración
  const cfg: ProblemConfig = { ...DEFAULT_CONFIG };
  if (isObj(st.cfg)) {
    for (const [k, allowed] of Object.entries(ENUMS) as [keyof ProblemConfig, readonly unknown[]][]) {
      const v = st.cfg[k];
      if (v !== undefined && allowed.includes(v)) (cfg as unknown as Record<string, unknown>)[k] = v;
    }
  }

  // Valores escritos: id conocido, número finito, unidad de la dimensión correcta.
  const entered: EnteredInputs = {};
  const dropped: string[] = [];
  if (isObj(st.entered)) {
    for (const [id, e] of Object.entries(st.entered)) {
      const def = INPUT_BY_ID.get(id as InputId);
      if (!def || !isObj(e) || typeof e.value !== 'number' || !Number.isFinite(e.value) || typeof e.unit !== 'string') { dropped.push(id); continue; }
      let dimOk = false;
      try { dimOk = getUnit(e.unit).dim === def.dim; } catch { dimOk = false; }
      if (!dimOk) { dropped.push(id); continue; }
      entered[id as InputId] = { value: e.value, unit: e.unit, ...(typeof e.source === 'string' ? { source: e.source.slice(0, 200) } : {}) };
    }
  }

  // Unidades preferidas
  const unitPref = defaultUnits(system);
  if (isObj(st.unitPref)) {
    for (const [id, u] of Object.entries(st.unitPref)) {
      const def = INPUT_BY_ID.get(id as InputId);
      if (!def || typeof u !== 'string') continue;
      try { if (getUnit(u).dim === def.dim) unitPref[id as InputId] = u; } catch { /* unidad desconocida */ }
    }
  }

  // Selecciones de tablas: solo ids que existen
  const selections: Selections = {};
  const sel = isObj(st.selections) ? st.selections : {};
  if (typeof sel.acmeSize === 'string' && ACME_SIZES.some(a => a.id === sel.acmeSize)) selections.acmeSize = sel.acmeSize;
  if (typeof sel.screwMaterial === 'string' && SCREW_MATERIALS.some(m => m.id === sel.screwMaterial)) selections.screwMaterial = sel.screwMaterial;
  if (isObj(sel.threadPair)) {
    const { screw, nut } = sel.threadPair as Record<string, string>;
    const range = (THREAD_FRICTION as Record<string, Record<string, [number, number] | null>>)[screw]?.[nut];
    if (range) { selections.threadPair = { screw, nut } as Selections['threadPair']; selections.fRange = range; }
  }
  if (typeof sel.collarPair === 'string') {
    const c = COLLAR_FRICTION.find(x => x.id === sel.collarPair);
    if (c) { selections.collarPair = c.id; selections.fcStart = c.starting; }
  }
  if (typeof sel.endCondition === 'string' && END_CONDITIONS.some(e => e.id === sel.endCondition)) selections.endCondition = sel.endCondition;

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : 'Proyecto importado';
  if (dropped.length) {
    // Se carga igual, pero sin los datos inválidos; el nombre lo advierte.
    return { ok: true, name: `${name} (se omitieron datos inválidos: ${dropped.join(', ')})`, state: { cfg, entered, unitPref, selections } };
  }
  return { ok: true, name, state: { cfg, entered, unitPref, selections } };
}

// ── Biblioteca local ─────────────────────────────────────────────────────────

export interface KeyValueStore { getItem(k: string): string | null; setItem(k: string, v: string): void }

export function listProjects(store: KeyValueStore | null, system: UnitSystem = 'SI'): SavedProject[] {
  if (!store) return [];
  let raw: unknown;
  try { raw = JSON.parse(store.getItem(LIB_KEY) ?? '[]'); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const out: SavedProject[] = [];
  for (const p of raw) {
    if (!isObj(p) || typeof p.id !== 'string' || typeof p.data !== 'string') continue;
    const r = parse(p.data, system);
    if (r.ok) out.push({ id: p.id, name: r.name, savedAt: typeof p.savedAt === 'string' ? p.savedAt : '', state: r.state });
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function writeLib(store: KeyValueStore, items: { id: string; savedAt: string; data: string }[]): boolean {
  try { store.setItem(LIB_KEY, JSON.stringify(items)); return true; } catch { return false; }
}

function readLib(store: KeyValueStore): { id: string; savedAt: string; data: string }[] {
  try {
    const raw = JSON.parse(store.getItem(LIB_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter(p => isObj(p) && typeof p.id === 'string' && typeof p.data === 'string') : [];
  } catch { return []; }
}

/** Guarda (o sobrescribe si `id` existe). Devuelve el id, o null si el navegador no permite guardar. */
export function saveProject(store: KeyValueStore | null, name: string, state: ProblemState, id?: string, now = new Date()): string | null {
  if (!store) return null;
  const items = readLib(store);
  const pid = id ?? `p${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const entry = { id: pid, savedAt: now.toISOString(), data: serialize(state, name, now) };
  const i = items.findIndex(p => p.id === pid);
  if (i >= 0) items[i] = entry; else items.push(entry);
  return writeLib(store, items) ? pid : null;
}

export function deleteProject(store: KeyValueStore | null, id: string): boolean {
  if (!store) return false;
  return writeLib(store, readLib(store).filter(p => p.id !== id));
}

// ── Informe exportable ───────────────────────────────────────────────────────

/** Informe en Markdown: datos, resultados y verificaciones (sin referencias bibliográficas). */
export function reportMarkdown(name: string, state: ProblemState, r: EngineResult, system: UnitSystem): string {
  const lines: string[] = [`# ${name}`, '', '## Datos', '', '| Dato | Valor | Unidad | Origen |', '|---|---|---|---|'];
  for (const [id, e] of Object.entries(state.entered) as [InputId, NonNullable<EnteredInputs[InputId]>][]) {
    lines.push(`| ${varLabel(id)} | ${fmtNum(e.value)} | ${getUnit(e.unit).text} | ${e.source ?? 'escrito'} |`);
  }
  lines.push('', '## Resultados', '', '| Resultado | Valor | Unidad |', '|---|---|---|');
  for (const s of r.steps) {
    if (s.hidden) continue;
    const dim = varDim(s.target);
    const unit = dim === 'angle' ? 'deg' : DEFAULT_UNITS[system][dim] ?? BASE_UNIT[dim];
    lines.push(`| ${varLabel(s.target)} | ${fmtNum(fromBase(s.value, unit))} | ${getUnit(unit).text || '—'} |`);
  }
  lines.push('', '## Verificaciones', '', '| Verificación | Estado | Calculado | Requerido |', '|---|---|---|---|');
  const word = { ok: 'cumple', fail: 'no cumple', warn: 'atención', pending: 'pendiente', na: 'no aplica' } as const;
  for (const c of r.checks) {
    lines.push(`| ${c.label} | ${word[c.status]} | ${c.outcome ? fmtNum(c.outcome.computed) : '—'} | ${c.outcome ? fmtNum(c.outcome.required) : '—'} |`);
  }
  return lines.join('\n') + '\n';
}
