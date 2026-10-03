import type { EngineResult, ProblemConfig, StageId, StepResult } from '../engine/types';
import type { SizingResult } from '../engine/sizing';
import { varLabel, varSymbol } from '../engine/vars';
import { getUnit } from '../engine/units';
import { fmtNum } from '../engine/format';
import type { Action, UnitSystem } from '../state/problemState';
import { Chip } from './Chip';
import Tex from './Tex';
import ResultSummary from './ResultSummary';
import SizingTable from './SizingTable';
import TorqueBreakdown from './charts/TorqueBreakdown';
import EfficiencyLeadChart from './charts/EfficiencyLeadChart';
import NutLoadShare from './charts/NutLoadShare';
import { inputTex, resultTex } from './valueFormat';

const STAGES: { id: StageId; title: string }[] = [
  { id: 'geometry',     title: 'Geometría de la rosca' },
  { id: 'load',         title: 'Carga' },
  { id: 'torque',       title: 'Pares' },
  { id: 'transmission', title: 'Transmisión' },
  { id: 'efficiency',   title: 'Eficiencia' },
  { id: 'locking',      title: 'Autobloqueo' },
  { id: 'body',         title: 'Esfuerzos en el cuerpo' },
  { id: 'thread',       title: 'Esfuerzos en la rosca' },
  { id: 'buckling',     title: 'Pandeo' },
  { id: 'wear',         title: 'Desgaste' },
  { id: 'kinematics',   title: 'Cinemática y potencia' },
  { id: 'sizing',       title: 'Dimensionamiento' },
];

function StepView({ step, no, system, values }: { step: StepResult; no: string; system: UnitSystem; values: EngineResult['values'] }) {
  const vars = step.inputsUsed.filter(id => values[id] !== undefined).map(id => inputTex(id, values[id]!));
  return (
    <div className="ps-step">
      <span className="ps-stepno" aria-label={`Paso ${no}`}>{no}</span>
      <div className="ps-row">
        <span className="ps-rowlabel">Ecuación</span>
        <Tex display tex={step.general} />
      </div>
      {vars.length > 0 && (
        <div className="ps-row">
          <span className="ps-rowlabel">Variables</span>
          <Tex tex={vars.join(',\\quad ')} />
        </div>
      )}
      {step.substituted && (
        <div className="ps-row">
          <span className="ps-rowlabel">Sustitución</span>
          <Tex display tex={step.substituted} />
        </div>
      )}
      <div className="ps-row">
        <span className="ps-rowlabel">Resultado</span>
        <span className="ps-final"><Tex tex={resultTex(step.target, step.value, system)} /></span>
      </div>
      {step.note && <div className="ps-note">{step.note}</div>}
    </div>
  );
}

interface TraceProps {
  result: EngineResult;
  system: UnitSystem;
  cfg: ProblemConfig;
  dispatch: (a: Action) => void;
  sizing?: SizingResult;
  statement?: { title: string; text: string };
  onHideStatement?: () => void;
}

/** Gráficos que cierran una etapa, cuando hay datos para dibujarlos. */
function stageChart(id: StageId, result: EngineResult, cfg: ProblemConfig) {
  const v = result.values;
  if (id === 'torque' && v.T0 !== undefined && v.TR !== undefined && v.T !== undefined) return <TorqueBreakdown result={result} />;
  if (id === 'locking' && v.lambda !== undefined && (v.f !== undefined || v.fMin !== undefined) && v.alpha !== undefined) {
    return <EfficiencyLeadChart result={result} cfg={cfg} />;
  }
  if (id === 'thread' && v.sb1 !== undefined) return <NutLoadShare />;
  return null;
}

export default function TraceView({ result, system, cfg, dispatch, sizing, statement, onHideStatement }: TraceProps) {
  const sugg = result.suggestions[0];
  const visibleSteps = result.steps.filter(s => !s.hidden);

  let rendered = 0;
  const stages = STAGES.map(st => {
    const steps = visibleSteps.filter(s => s.stage === st.id);
    const pending = result.pending.filter(p => p.stage === st.id);
    const blocked = result.blocked.filter(b => b.stage === st.id);
    return { ...st, steps, pending, blocked };
  }).filter(st => st.steps.length || st.pending.length || st.blocked.length);

  return (
    <section className="ps-trace ps-zone" aria-label="Cálculo paso a paso">
      {statement && (
        <aside className="ps-statement" aria-label="Planteamiento">
          <header className="ps-statement-head">
            <h2 className="ps-statement-title">Planteamiento · {statement.title}</h2>
            <button type="button" className="ps-statement-hide" onClick={onHideStatement}>Ocultar</button>
          </header>
          <p className="ps-statement-text">{statement.text}</p>
        </aside>
      )}
      <ResultSummary result={result} cfg={cfg} system={system} />
      {sugg && (
        <p className="ps-hint">
          Próximo dato útil: <Chip id={sugg.id} /> desbloquea {sugg.unlocks} {sugg.unlocks === 1 ? 'resultado' : 'resultados'}.
        </p>
      )}

      {result.conversions.length > 0 && (
        <p className="ps-conv">
          Conversiones:{' '}
          {result.conversions.map((c, i) => (
            <span key={c.id + i} className="ps-conv-item">
              <Tex tex={`${fmtNum(c.from.value)}\\,${getUnit(c.from.unit).label} \\rightarrow ${fmtNum(c.to.value)}\\,${getUnit(c.to.unit).label}`} />
              {i < result.conversions.length - 1 ? '; ' : ''}
            </span>
          ))}
        </p>
      )}

      {visibleSteps.length === 0 && (
        <p className="ps-empty">
          Cada resultado aparece en cuanto tiene los datos que necesita. Empieza por la rosca y la carga; lo que
          todavía falta se anota aquí en rojo.
        </p>
      )}

      {sizing && <SizingTable sizing={sizing} dispatch={dispatch} />}

      {stages.map(st => {
        rendered += 1;
        const k = st.steps.length;
        const n = k + st.pending.length + st.blocked.length;
        const status = k === 0 ? 'pendiente' : k === n ? 'completo' : `parcial ${k} de ${n}`;
        return (
          <section key={st.id} className="ps-stage" aria-label={st.title}>
            <header className="ps-stage-head">
              <h2 className="ps-h2">{st.title}</h2>
              <span className="ps-stage-status">{status}</span>
            </header>
            <div className="ps-sheet">
              {st.steps.map((s, i) => (
                <StepView key={s.ruleId + i} step={s} no={`${rendered}.${i + 1}`} system={system} values={result.values} />
              ))}
              {st.pending.map(p => (
                <p key={'p' + p.target} className="ps-pending">
                  <Tex tex={varSymbol(p.target)} /> {varLabel(p.target)}: falta{' '}
                  {p.missing.map(id => <Chip key={id} id={id} />)}
                  {p.reason && <> No se pudo obtener con los datos de entrada: {p.reason}</>}
                </p>
              ))}
              {st.blocked.map(b => (
                <p key={'b' + b.target} className="ps-blocked">
                  <Tex tex={varSymbol(b.target)} /> {varLabel(b.target)}: no se puede calcular. {b.reason}
                </p>
              ))}
              {stageChart(st.id, result, cfg)}
            </div>
          </section>
        );
      })}
    </section>
  );
}
