import type { KeyValueStore } from '../state/persistence';

/** localStorage si está disponible (puede estar bloqueado); si no, null. */
export function getStore(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    const probe = 'calcmech-power-screw:probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
