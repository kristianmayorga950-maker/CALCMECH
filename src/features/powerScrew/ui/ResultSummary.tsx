import type { EngineResult, ProblemConfig } from '../engine/types';
import { goalHighlights, verdict } from '../engine/summary';
import { varLabel, varSymbol } from '../engine/vars';
import { fmtNum } from '../engine/format';
import type { UnitSystem } from '../state/problemState';
import Tex from './Tex';
import { valueTex } from './valueFormat';

const STATUS_WORD = { ok: 'cumple', warn: 'atención', fail: 'no cumple', incomplete: 'incompleto' } as const;
const STATUS_CLS = { ok: 'is-ok', warn: 'is-warn', fail: 'is-fail', incomplete: 'is-pend' } as const;

export default function ResultSummary({ result, cfg, system }: { result: EngineResult; cfg: ProblemConfig; system: UnitSystem }) {
  const ids = goalHighlights(cfg, result).slice(0, 4);
  const v = verdict(result.checks, cfg);
  if (ids.length === 0 && v.evaluated === 0) return null;

  return (
    <section className="ps-summary-box" aria-label="Resumen del resultado">
      {ids.length > 0 && (
        <>
          <h2 className="ps-h3 ps-summary-h">Resultado buscado</h2>
          <ul className="ps-heroes">
            {ids.map(id => (
              <li key={id} className="ps-hero">
                <div className="ps-hero-name">
                  <Tex tex={varSymbol(id)} /> <span>{varLabel(id)}</span>
                </div>
                <div className="ps-hero-val"><Tex tex={valueTex(id, result.values[id]!, system)} /></div>
              </li>
            ))}
          </ul>
        </>
      )}
      {v.evaluated > 0 && (
        <p className="ps-verdict-line">
          <strong>{v.title}</strong>{' '}
          <span className={'ps-status ' + STATUS_CLS[v.status]}>{STATUS_WORD[v.status].toUpperCase()}</span>
          {v.governing && (
            <span className="ps-gov"> Gobierna: {v.governing.label} (utilización {fmtNum(v.governing.utilization * 100)} %)</span>
          )}
        </p>
      )}
    </section>
  );
}
