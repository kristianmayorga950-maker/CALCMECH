import type { CheckResult, ProblemConfig } from '../../engine/types';
import { utilization, verdict } from '../../engine/summary';
import { fmtNum } from '../../engine/format';
import Interpretation from './Interpretation';
import { interpretUtilization } from '../../engine/interpret';

const CAP = 1.5;

export default function UtilizationBars({ checks, cfg }: { checks: CheckResult[]; cfg: ProblemConfig }) {
  const evaluated = checks.filter(c => c.status === 'ok' || c.status === 'fail' || c.status === 'warn');
  const rows = evaluated
    .filter(c => !(c.id === 'selfLock' && !cfg.requireSelfLock))
    .map(c => ({ c, u: utilization(c) }))
    .filter((r): r is { c: CheckResult; u: number } => r.u !== undefined)
    .sort((a, b) => b.u - a.u);
  if (rows.length === 0) return null;
  const govId = verdict(checks, cfg).governing?.id;
  const limitPct = (1 / CAP) * 100;

  return (
    <figure className="ps-chart ps-util" aria-label="Utilización por criterio">
      <figcaption className="ps-chart-cap">¿Qué criterio gobierna? Demanda sobre capacidad: hasta el límite cumple.</figcaption>
      <div className="ps-util-scale" aria-hidden="true">
        <span style={{ left: `${limitPct}%` }}>límite</span>
      </div>
      <ul>
        {rows.map(({ c, u }) => {
          const ok = u <= 1;
          const finite = Number.isFinite(u);
          const text = finite ? `${fmtNum(u * 100)} % · ${ok ? 'cumple' : 'no cumple'}` : 'sin capacidad · no cumple';
          return (
            <li key={c.id} className={'ps-util-row' + (c.id === govId ? ' is-gov' : '')} title={`${c.label}: ${text}`}>
              <div className="ps-util-head">
                <span className="ps-util-name">{c.label}</span>
                <span className={'ps-util-text ' + (ok ? 'is-ok' : 'is-fail')}>{text}</span>
              </div>
              <div className="ps-util-track" role="img" aria-label={`${c.label}: ${text}`}>
                <div className={'ps-util-bar ' + (ok ? 'is-ok' : 'is-fail')}
                  style={{ width: `${(Math.min(finite ? u : CAP, CAP) / CAP) * 100}%` }} />
                <div className="ps-util-limit" style={{ left: `${limitPct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <Interpretation text={interpretUtilization(checks, cfg)} />
    </figure>
  );
}
