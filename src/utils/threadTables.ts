/**
 * Tablas de roscas — Shigley 9ª Ed.:
 *   Tabla 8-1 (UNS: UNC series gruesas, UNF series finas)
 *   Tabla 8-2 (ISO métrico)
 *   Tabla 8-3 (Acme, para tornillos de potencia)
 * Se cargan una sola vez por fetch.
 */

export interface ThreadData {
  nominal:  string;
  pitch:    number;   // mm
  tpi?:     number;
  dM:       number;
  dm:       number;
  dr:       number;
  At:       number;   // mm²
  Ar:       number;   // mm²
}

export type ThreadStandard = 'unc' | 'unf' | 'iso' | 'acme';

let UNC_THREADS:  ThreadData[] = [];
let UNF_THREADS:  ThreadData[] = [];
let ISO_THREADS:  ThreadData[] = [];
let ACME_THREADS: ThreadData[] = [];
let loaded = false;

export async function loadThreadTables(): Promise<void> {
  if (loaded) return;
  const [unc, unf, iso, acme] = await Promise.all([
    fetch('/data/threads_unc.json').then(r => r.json()),
    fetch('/data/threads_unf.json').then(r => r.json()),
    fetch('/data/threads_iso.json').then(r => r.json()),
    fetch('/data/threads_acme.json').then(r => r.json()),
  ]);
  UNC_THREADS  = unc;
  UNF_THREADS  = unf;
  ISO_THREADS  = iso;
  ACME_THREADS = acme;
  loaded = true;
}

function table(standard: ThreadStandard): ThreadData[] {
  switch (standard) {
    case 'unc':  return UNC_THREADS;
    case 'unf':  return UNF_THREADS;
    case 'iso':  return ISO_THREADS;
    case 'acme': return ACME_THREADS;
  }
}

export function getThreadData(standard: ThreadStandard, nominal: string): ThreadData | null {
  return table(standard).find(t => t.nominal === nominal) ?? null;
}

export function getAllDiameters(standard: ThreadStandard): string[] {
  return table(standard).map(t => t.nominal);
}

export function getAllThreads(standard: ThreadStandard): ThreadData[] {
  return table(standard);
}

export function getThreadsLoaded(): boolean {
  return loaded;
}
