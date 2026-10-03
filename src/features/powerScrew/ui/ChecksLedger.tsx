import type { CheckResult, EngineResult, InputIssue, ProblemConfig } from '../engine/types';
import { varSymbol } from '../engine/vars';
import { fmtNum } from '../engine/format';
import { Chip } from './Chip';
import { focusInput } from './focusInput';
import Tex from './Tex';
import UtilizationBars from './charts/UtilizationBars';

const STATUS_TEXT: Record<CheckResult['status'], { word: string; cls: string }> = {
  ok:      { word: 'CUMPLE',     cls: 'is-ok' },
  fail:    { word: 'NO CUMPLE',  cls: 'is-fail' },
  warn:    { word: 'ATENCIÓN',   cls: 'is-warn' },
  pending: { word: 'PENDIENTE',  cls: 'is-pend' },
  na:      { word: 'NO APLICA',  cls: 'is-pend' },
};

function CheckItem({ c }: { c: CheckResult }) {
  const st = STATUS_TEXT[c.status];
  return (
    <li className="ps-check">
      <div className="ps-check-head">
        <span className={'ps-status ' + st.cls}>{st.word}</span>
        <span className="ps-check-label">{c.label}</span>
      </div>
      {c.outcome && (
        <>
          <Tex tex={c.outcome.criterion} className="ps-tex ps-check-crit" />
          <div className="ps-check-nums">
            calculado {fmtNum(c.outcome.computed)} · requerido {fmtNum(c.outcome.required)}
          </div>
          <div className="ps-check-expl">{c.outcome.explanation}</div>
        </>
      )}
      {c.status === 'pending' && c.missing && c.missing.length > 0 && (
        <div className="ps-pending-inline">
          falta {c.missing.map(id => <Chip key={id} id={id} />)}
        </div>
      )}
      {c.status === 'na' && c.reason && <div className="ps-check-expl">{c.reason}</div>}
    </li>
  );
}

function IssueItem({ i }: { i: InputIssue }) {
  return (
    <li>
      <button type="button" className={'ps-issue ' + (i.severity === 'error' ? 'is-error' : 'is-warn')}
        onClick={() => focusInput(i.id)}>
        <span className="ps-issue-kind">{i.severity === 'error' ? 'Error' : 'Aviso'}</span>{' '}
        <Tex tex={varSymbol(i.id)} />: {i.message}
      </button>
    </li>
  );
}

export default function ChecksLedger({ result, cfg }: { result: EngineResult; cfg: ProblemConfig }) {
  const evaluated = result.checks.filter(c => c.status === 'ok' || c.status === 'fail' || c.status === 'warn').length;
  const pendingN = result.checks.filter(c => c.status === 'pending').length;
  const issues = [...result.issues].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));

  return (
    <aside className="ps-ledger ps-zone" aria-label="Verificaciones">
      <section className="ps-statebox">
        <h2 className="ps-h2">Estado del diseño</h2>
        {result.checks.length === 0 && <p className="ps-muted">Las verificaciones aparecen cuando hay datos suficientes.</p>}
        <p className="ps-counts">{evaluated} evaluadas · {pendingN} pendientes</p>
      </section>

      <UtilizationBars checks={result.checks} cfg={cfg} />

      {result.checks.length > 0 && (
        <ul className="ps-checks">
          {result.checks.map(c => <CheckItem key={c.id} c={c} />)}
        </ul>
      )}

      <section className="ps-sec">
        <h2 className="ps-h2">Avisos de datos</h2>
        {issues.length === 0
          ? <p className="ps-muted">Sin avisos.</p>
          : <ul className="ps-issues">{issues.map((i, k) => <IssueItem key={i.id + k} i={i} />)}</ul>}
      </section>
    </aside>
  );
}
