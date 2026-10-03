import { useEffect, useRef, useState } from 'react';
import { usePowerScrew } from '../state/usePowerScrew';
import type { UnitSystem } from '../state/problemState';
import type { ProblemConfig } from '../engine/types';
import ProblemRail from './ProblemRail';
import TraceView from './TraceView';
import ChecksLedger from './ChecksLedger';
import ProjectMenu, { DEFAULT_NAME } from './ProjectMenu';
import { EXAMPLES, type WorkedExample } from '../examples/examples';
import { loadSession, saveSession } from '../state/session';
import { getStore } from './storage';
import './powerScrew.css';

function summary(cfg: ProblemConfig): string[] {
  const out = [
    cfg.thread === 'square' ? 'rosca cuadrada' : 'rosca Acme',
    cfg.transmission === 'direct' ? 'par directo' : cfg.transmission === 'lever' ? 'palanca' : 'reductor',
  ];
  if (cfg.thrust === 'collar') out.push('con collarín');
  if (cfg.thrust === 'bearing') out.push('con rodamiento');
  out.push(cfg.load === 'compression' ? 'compresión' : 'tensión');
  return out;
}

export function PowerScrewWorkspace({ system }: { system: UnitSystem }) {
  // La sesión anterior (si la hay) se recupera una sola vez al montar.
  const [session] = useState(() => loadSession(getStore(), system));
  const { state, dispatch, result, sizing } = usePowerScrew(system, session?.state);
  const [name, setName] = useState(session?.name ?? DEFAULT_NAME);
  const [example, setExample] = useState<WorkedExample | null>(
    () => EXAMPLES.find(e => e.id === session?.exampleId) ?? null,
  );

  // Autoguardado con medio segundo de espera; un estado vacío (Reiniciar) borra la ranura.
  useEffect(() => {
    const t = window.setTimeout(() => saveSession(getStore(), name, state, example?.id), 500);
    return () => window.clearTimeout(t);
  }, [state, name, example]);

  // Al salir de la sección o cerrar la pestaña se guarda sin esperar.
  const latest = useRef({ name, state, example });
  latest.current = { name, state, example };
  useEffect(() => {
    const flush = () => { const l = latest.current; saveSession(getStore(), l.name, l.state, l.example?.id); };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);
  const parts = summary(state.cfg);

  return (
    <div className="ps-root">
      <header className="ps-title">
        <h1 className="ps-h1">Tornillo de potencia</h1>
        <span className="ps-projname" title={name}>{name}</span>
        <p className="ps-summary">
          {parts.map((p, i) => (
            <span key={p}>{i > 0 && ' · '}<span className="ps-mono">{p}</span></span>
          ))}
        </p>
        <ProjectMenu system={system} state={state} dispatch={dispatch} result={result} name={name} setName={setName} onExample={setExample} />
      </header>
      <div className="ps-grid">
        <ProblemRail system={system} state={state} dispatch={dispatch} result={result} />
        <TraceView result={result} system={system} cfg={state.cfg} dispatch={dispatch} sizing={sizing}
          statement={example ? { title: example.title, text: example.statement } : undefined}
          onHideStatement={() => setExample(null)} />
        <ChecksLedger result={result} cfg={state.cfg} />
      </div>
    </div>
  );
}

export default PowerScrewWorkspace;
