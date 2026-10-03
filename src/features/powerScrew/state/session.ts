/**
 * Autoguardado de la sesión del tornillo de potencia.
 *
 * Una sola ranura, separada de los proyectos con nombre: guarda lo que hay en
 * pantalla para recuperarlo al volver a la sección o al recargar la página.
 * Usa el mismo formato validado de los proyectos (serialize/parse), así que un
 * dato corrupto nunca entra al estado. Si el navegador bloquea el
 * almacenamiento, todo sigue funcionando sin guardar.
 */

import { DEFAULT_CONFIG } from '../engine';
import type { ProblemConfig } from '../engine/types';
import { APP_TAG, parse, serialize, type KeyValueStore } from './persistence';
import type { ProblemState, UnitSystem } from './problemState';

export const SESSION_KEY = `${APP_TAG}:session`;

/** Qué estaba abierto: un ejemplo (muestra su planteamiento) o un proyecto guardado (Guardar lo sobrescribe). */
export interface SessionMeta { exampleId?: string; projectId?: string }

export interface Session extends SessionMeta { name: string; state: ProblemState; savedAt: string }

interface SessionEnvelope extends SessionMeta { data: string }

/** Sin datos escritos, sin tablas elegidas y con la configuración por defecto. */
export function isEmptyState(s: ProblemState): boolean {
  if (Object.keys(s.entered).length || Object.keys(s.selections).length) return false;
  return (Object.keys(DEFAULT_CONFIG) as (keyof ProblemConfig)[]).every(k => s.cfg[k] === DEFAULT_CONFIG[k]);
}

export function clearSession(store: KeyValueStore | null): void {
  if (!store) return;
  try {
    if (store.removeItem) store.removeItem(SESSION_KEY);
    else store.setItem(SESSION_KEY, '');
  } catch { /* almacenamiento bloqueado */ }
}

/** Guarda la sesión; un estado vacío borra la ranura. Devuelve si quedó guardada. */
export function saveSession(store: KeyValueStore | null, name: string, state: ProblemState, meta: SessionMeta = {}, now = new Date()): boolean {
  if (!store) return false;
  if (isEmptyState(state)) { clearSession(store); return false; }
  const env: SessionEnvelope = {
    data: serialize(state, name, now),
    ...(meta.exampleId ? { exampleId: meta.exampleId } : {}),
    ...(meta.projectId ? { projectId: meta.projectId } : {}),
  };
  try { store.setItem(SESSION_KEY, JSON.stringify(env)); return true; } catch { return false; }
}

export function loadSession(store: KeyValueStore | null, system: UnitSystem = 'SI'): Session | null {
  if (!store) return null;
  let raw: string | null;
  try { raw = store.getItem(SESSION_KEY); } catch { return null; }
  if (!raw) return null;
  let env: unknown;
  try { env = JSON.parse(raw); } catch { return null; }
  if (typeof env !== 'object' || env === null || typeof (env as SessionEnvelope).data !== 'string') return null;
  const { data, exampleId, projectId } = env as SessionEnvelope;
  const r = parse(data, system);
  if (!r.ok) return null;
  let savedAt = '';
  try { const s = JSON.parse(data).savedAt; if (typeof s === 'string') savedAt = s; } catch { /* ya validado */ }
  return {
    name: r.name, state: r.state, savedAt,
    ...(typeof exampleId === 'string' ? { exampleId } : {}),
    ...(typeof projectId === 'string' ? { projectId } : {}),
  };
}
