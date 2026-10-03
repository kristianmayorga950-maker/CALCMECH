import { useState } from 'react';
import { usePowerScrew } from '../state/usePowerScrew';
import type { UnitSystem } from '../state/problemState';
import type { ProblemConfig } from '../engine/types';
import ProblemRail from './ProblemRail';
import TraceView from './TraceView';
import ChecksLedger from './ChecksLedger';
import ProjectMenu, { DEFAULT_NAME } from './ProjectMenu';
import type { WorkedExample } from '../examples/examples';
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
  const { state, dispatch, result, sizing } = usePowerScrew(system);
  const [name, setName] = useState(DEFAULT_NAME);
  const [example, setExample] = useState<WorkedExample | null>(null);
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
