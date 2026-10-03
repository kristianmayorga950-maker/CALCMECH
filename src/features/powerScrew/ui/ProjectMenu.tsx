import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { Action, ProblemState, UnitSystem } from '../state/problemState';
import type { EngineResult } from '../engine/types';
import { EXAMPLES, type WorkedExample } from '../examples/examples';
import {
  deleteProject, listProjects, parse, reportMarkdown, saveProject, serialize, type SavedProject,
} from '../state/persistence';
import { getStore } from './storage';
import { projectSnapshot } from './schematic/fromState';
import { ProjectThumbnail } from './schematic/SystemSchematic';

export const DEFAULT_NAME = 'Proyecto sin nombre';

interface Props {
  system: UnitSystem;
  state: ProblemState;
  dispatch: Dispatch<Action>;
  result: EngineResult;
  name: string;
  setName: (n: string) => void;
  onExample: (ex: WorkedExample | null) => void;
  /** Proyecto guardado abierto (lo guarda el autoguardado de la sesión). */
  currentId: string | undefined;
  setCurrentId: (id: string | undefined) => void;
}

type Pending =
  | { kind: 'example'; ex: WorkedExample }
  | { kind: 'open'; p: SavedProject }
  | { kind: 'import'; name: string; state: ProblemState }
  | { kind: 'delete'; p: SavedProject }
  | { kind: 'reset' };

function slug(name: string): string {
  const s = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'proyecto';
}

function download(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function ProjectMenu({ system, state, dispatch, result, name, setName, onExample, currentId, setCurrentId }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(name);
  const [pending, setPending] = useState<Pending | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const panelId = useId();

  const hasData = Object.keys(state.entered).length > 0 || Object.keys(state.selections).length > 0;
  // `version` fuerza releer la biblioteca tras guardar o borrar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saved = useMemo(() => (open ? listProjects(getStore(), system) : []), [open, system, version]);
  const snaps = useMemo(() => new Map(saved.map(p => [p.id, projectSnapshot(p.state)])), [saved]);

  const close = (focus = true) => {
    setOpen(false); setPending(null); setStatus(''); setError('');
    if (focus) btn.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) close(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = () => {
    if (open) { close(); return; }
    setDraft(name); setOpen(true);
  };

  const doLoad = (n: string, s: ProblemState, id: string | undefined, ex: WorkedExample | null) => {
    dispatch({ type: 'load', state: s });
    setName(n); setDraft(n); setCurrentId(id); onExample(ex);
    close();
  };

  const commit = (p: Pending) => {
    switch (p.kind) {
      case 'example': doLoad(p.ex.title, p.ex.build(system), undefined, p.ex); break;
      case 'open': doLoad(p.p.name, p.p.state, p.p.id, null); break;
      case 'import': doLoad(p.name, p.state, undefined, null); break;
      case 'delete':
        deleteProject(getStore(), p.p.id);
        if (currentId === p.p.id) setCurrentId(undefined);
        setPending(null); setVersion(v => v + 1);
        break;
      case 'reset':
        dispatch({ type: 'reset', system });
        setName(DEFAULT_NAME); setDraft(DEFAULT_NAME); setCurrentId(undefined); onExample(null);
        close();
        break;
    }
  };

  const requestLoad = (p: Pending) => {
    setError(''); setStatus('');
    if (hasData) { setPending(p); return; }
    commit(p);
  };

  const save = (asCopy: boolean) => {
    const base = draft.trim() || DEFAULT_NAME;
    const n = asCopy ? `${base} (copia)` : base;
    const id = saveProject(getStore(), n, state, asCopy ? undefined : currentId);
    if (id === null) { setStatus(''); setError('Este navegador no permite guardar (almacenamiento bloqueado).'); return; }
    setError(''); setCurrentId(id); setName(n); setDraft(n); setStatus(asCopy ? 'Copia guardada' : 'Guardado');
    setVersion(v => v + 1);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    let text: string;
    try { text = await f.text(); } catch { setError('No se pudo leer el archivo.'); return; }
    const r = parse(text, system);
    if (!r.ok) { setStatus(''); setError(r.error); return; }
    requestLoad({ kind: 'import', name: r.name, state: r.state });
  };

  const confirmBox = (text: string, yes: string, no: string, p: Pending) => (
    <div className="ps-pm-confirm" role="alertdialog" aria-label={text}>
      <p>{text}</p>
      <div className="ps-pm-row">
        <button type="button" className="ps-pm-btn ps-pm-primary" onClick={() => commit(p)}>{yes}</button>
        <button type="button" className="ps-pm-btn" onClick={() => setPending(null)}>{no}</button>
      </div>
    </div>
  );

  const replaceConfirm = pending && (pending.kind === 'example' || pending.kind === 'open' || pending.kind === 'import')
    ? confirmBox('Se reemplazarán los datos actuales.', 'Cargar', 'Cancelar', pending) : null;

  return (
    <div className="ps-pm" ref={root}>
      <button
        ref={btn} type="button" className="ps-pm-toggle"
        aria-haspopup="true" aria-expanded={open} aria-controls={open ? panelId : undefined}
        onClick={toggle}
      >
        Proyecto <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ps-pm-panel" id={panelId} role="group" aria-label="Menú de proyecto">
          {replaceConfirm}
          {pending?.kind === 'reset' && confirmBox('Se borrarán todos los datos.', 'Reiniciar', 'Cancelar', pending)}
          {error && <p className="ps-pm-error" role="alert">{error}</p>}
          {status && <p className="ps-pm-status" role="status">{status}</p>}

          <section className="ps-pm-sec" aria-label="Ejemplos">
            <h3 className="ps-pm-h">Ejemplos</h3>
            {EXAMPLES.map(ex => (
              <button key={ex.id} type="button" className="ps-pm-item" onClick={() => requestLoad({ kind: 'example', ex })}>{ex.title}</button>
            ))}
          </section>

          <section className="ps-pm-sec" aria-label="Guardar">
            <h3 className="ps-pm-h">Guardar</h3>
            <label className="ps-pm-label">
              Nombre del proyecto
              <input className="ps-pm-input" value={draft} maxLength={80} onChange={e => setDraft(e.target.value)} />
            </label>
            <div className="ps-pm-row">
              <button type="button" className="ps-pm-btn ps-pm-primary" onClick={() => save(false)}>Guardar</button>
              <button type="button" className="ps-pm-btn" onClick={() => save(true)}>Guardar una copia</button>
            </div>
          </section>

          <section className="ps-pm-sec" aria-label="Abrir guardado">
            <h3 className="ps-pm-h">Abrir guardado</h3>
            {saved.length === 0 && <p className="ps-pm-empty">No hay proyectos guardados en este navegador.</p>}
            <ul className="ps-pm-list">
              {saved.map(p => (
                <li key={p.id} className="ps-pm-saved">
                  <span className="ps-pm-sname">{p.name}</span>
                  <span className="ps-pm-date ps-mono">{p.savedAt ? new Date(p.savedAt).toLocaleString('es') : ''}</span>
                  {snaps.get(p.id) && <ProjectThumbnail snap={snaps.get(p.id)!} />}
                  {pending?.kind === 'delete' && pending.p.id === p.id ? (
                    <div className="ps-pm-confirm" role="alertdialog" aria-label={`¿Borrar «${p.name}»?`}>
                      <p>¿Borrar «{p.name}»?</p>
                      <div className="ps-pm-row">
                        <button type="button" className="ps-pm-btn ps-pm-primary" onClick={() => commit(pending)}>Sí</button>
                        <button type="button" className="ps-pm-btn" onClick={() => setPending(null)}>No</button>
                      </div>
                    </div>
                  ) : (
                    <div className="ps-pm-row">
                      <button type="button" className="ps-pm-btn" onClick={() => requestLoad({ kind: 'open', p })}>Abrir</button>
                      <button type="button" className="ps-pm-btn" onClick={() => { setError(''); setStatus(''); setPending({ kind: 'delete', p }); }}>Borrar</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="ps-pm-sec" aria-label="Archivo">
            <h3 className="ps-pm-h">Archivo</h3>
            <button type="button" className="ps-pm-item" onClick={() => { download(serialize(state, name), `${slug(name)}.json`, 'application/json'); close(); }}>
              Exportar proyecto (.json)
            </button>
            <button type="button" className="ps-pm-item" onClick={() => { download(reportMarkdown(name, state, result, system), `${slug(name)}-informe.md`, 'text/markdown'); close(); }}>
              Exportar informe (.md)
            </button>
            <button type="button" className="ps-pm-item" onClick={() => file.current?.click()}>Importar proyecto (.json)</button>
            <input ref={file} type="file" accept=".json,application/json" hidden onChange={onFile} />
          </section>

          <section className="ps-pm-sec" aria-label="Reiniciar">
            <h3 className="ps-pm-h">Reiniciar</h3>
            <button type="button" className="ps-pm-item" onClick={() => { setError(''); setStatus(''); setPending({ kind: 'reset' }); }}>Reiniciar todos los datos</button>
          </section>
        </div>
      )}
    </div>
  );
}
