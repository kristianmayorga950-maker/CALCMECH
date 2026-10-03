import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EngineResult, Goal, ProblemConfig, Transmission } from '../engine/types';
import { INPUT_GROUP_LABEL, varLabel, varSymbol, visibleInputs, type InputDef, type InputGroup } from '../engine/vars';
import { DEFAULT_UNITS, fromBase, getUnit, unitsFor } from '../engine/units';
import { fmtNum } from '../engine/format';
import {
  ACME_SIZES, COLLAR_FRICTION, END_CONDITIONS, NUT_LABEL, SCREW_CONDITION_LABEL, SCREW_MATERIALS,
  THREAD_FRICTION, type NutMaterial, type ScrewCondition,
} from '../data/tables';
import type { Action, ProblemState, UnitSystem } from '../state/problemState';
import { Segmented } from './Segmented';
import Tex from './Tex';

interface Props {
  system: UnitSystem;
  state: ProblemState;
  dispatch: (a: Action) => void;
  result: EngineResult;
}

const GOAL_HELP: Record<Goal, string> = {
  analyze:  'Analizar: tienes el tornillo y la carga; se calculan pares, eficiencia y esfuerzos.',
  capacity: 'Capacidad: tienes el par o la fuerza disponible; se despeja la carga que se puede mover.',
  drive:    'Accionamiento: tienes la carga; se calcula el par o la fuerza que hay que aplicar.',
  size:     'Dimensionar: tienes los límites de resistencia; se busca el diámetro necesario.',
  lead:     'Avance: se revisan avance, autobloqueo y velocidad.',
};

/* ── Dibujos esquemáticos de los mecanismos ─────────────────────────────── */
const svgProps = {
  width: 44, height: 30, viewBox: '0 0 44 30', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.4, strokeLinecap: 'square' as const, 'aria-hidden': true,
};
const DrawDirect = () => (
  <svg {...svgProps}>
    <rect x="4" y="12" width="26" height="6" />
    <line x1="30" y1="15" x2="40" y2="15" />
    <path d="M 36 6 A 9 9 0 0 1 36 24" />
    <polyline points="33,24 36,24 36,21" />
  </svg>
);
const DrawLever = () => (
  <svg {...svgProps}>
    <circle cx="10" cy="15" r="3" />
    <line x1="10" y1="15" x2="38" y2="15" />
    <line x1="38" y1="5" x2="38" y2="14" />
    <polyline points="35,11 38,14 41,11" />
  </svg>
);
const DrawReducer = () => (
  <svg {...svgProps}>
    <circle cx="14" cy="15" r="8" />
    <circle cx="31" cy="15" r="5" />
    <circle cx="14" cy="15" r="1" />
    <circle cx="31" cy="15" r="1" />
  </svg>
);

const TX_OPTIONS: { id: Transmission; label: string; draw: ReactNode }[] = [
  { id: 'direct',  label: 'Par directo', draw: <DrawDirect /> },
  { id: 'lever',   label: 'Palanca',     draw: <DrawLever /> },
  { id: 'reducer', label: 'Reductor',    draw: <DrawReducer /> },
];

/* ── Campo numérico con borrador local ──────────────────────────────────── */
function parseDraft(s: string): number | undefined | 'invalid' {
  const t = s.trim().replace(',', '.');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : 'invalid';
}

interface FieldProps {
  def: InputDef;
  state: ProblemState;
  dispatch: (a: Action) => void;
  result: EngineResult;
}

function Field({ def, state, dispatch, result }: FieldProps) {
  const entered = state.entered[def.id];
  const [draft, setDraft] = useState(entered ? String(entered.value) : '');

  // Sincroniza el borrador cuando el valor cambia desde fuera (tablas, cambio de unidad).
  useEffect(() => {
    const parsed = parseDraft(draft);
    if (parsed !== 'invalid' && parsed === entered?.value) return;
    if (parsed === 'invalid' && entered === undefined) return;
    setDraft(entered ? String(entered.value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered?.value]);

  const units = unitsFor(def.dim);
  const showUnit = !(units.length === 1 && units[0].text === '');
  const unitId = entered?.unit ?? state.unitPref[def.id];
  const issues = result.issues.filter(i => i.id === def.id);
  const hasError = issues.some(i => i.severity === 'error');
  const sugg = !entered ? result.suggestions.find(s => s.id === def.id) : undefined;
  const inputId = 'ps-in-' + def.id;
  const msgId = inputId + '-msg';

  return (
    <div className="ps-field">
      <div className="ps-field-head">
        <label htmlFor={inputId} className="ps-field-label">
          <Tex tex={def.symbol} className="ps-tex ps-field-sym" />
          <span>{def.label}</span>
        </label>
        {sugg && <span className="ps-unlock">desbloquea {sugg.unlocks}</span>}
      </div>
      <div className="ps-field-line">
        <input
          id={inputId}
          className={'ps-input' + (hasError ? ' is-error' : '')}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft}
          aria-invalid={hasError || undefined}
          aria-describedby={issues.length || entered?.source ? msgId : undefined}
          onChange={e => {
            const text = e.target.value;
            setDraft(text);
            const p = parseDraft(text);
            if (p !== 'invalid') dispatch({ type: 'value', id: def.id, value: p });
          }}
        />
        {showUnit && (
          <select
            className="ps-unit"
            aria-label={`Unidad de ${def.label}`}
            value={unitId}
            onChange={e => dispatch({ type: 'unit', id: def.id, unit: e.target.value })}
          >
            {units.map(u => <option key={u.id} value={u.id}>{u.text || 'adim.'}</option>)}
          </select>
        )}
      </div>
      <div id={msgId}>
        {entered?.source && <div className="ps-source">desde: {entered.source}</div>}
        {issues.map((i, k) => (
          <div key={k} className={'ps-msg ' + (i.severity === 'error' ? 'is-error' : 'is-warn')}>
            {i.severity === 'error' ? 'Error: ' : 'Aviso: '}{i.message}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Select auxiliar ────────────────────────────────────────────────────── */
function HelperSelect({ id, label, value, onChange, children }: {
  id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode;
}) {
  return (
    <div className="ps-helper">
      <label htmlFor={id} className="ps-helper-label">{label}</label>
      <select id={id} className="ps-select" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

function ThreadPairHelper({ state, dispatch }: Pick<Props, 'state' | 'dispatch'>) {
  const sel = state.selections.threadPair;
  const [pick, setPick] = useState<{ screw?: ScrewCondition; nut?: NutMaterial }>(sel ?? {});
  const hadSel = useRef(!!sel);
  useEffect(() => {
    if (sel) { setPick(sel); hadSel.current = true; }
    else if (hadSel.current) { setPick({}); hadSel.current = false; }
  }, [sel]);

  const update = (next: { screw?: ScrewCondition; nut?: NutMaterial }) => {
    setPick(next);
    if (next.screw && next.nut && THREAD_FRICTION[next.screw][next.nut]) {
      dispatch({ type: 'threadPair', screw: next.screw, nut: next.nut });
    }
  };
  const missing = pick.screw && pick.nut && !THREAD_FRICTION[pick.screw][pick.nut];
  const range = state.selections.fRange;

  return (
    <>
      <HelperSelect id="ps-sel-screw" label="Tornillo" value={pick.screw ?? ''}
        onChange={v => update({ ...pick, screw: (v || undefined) as ScrewCondition | undefined })}>
        <option value="">— elegir —</option>
        {(Object.keys(SCREW_CONDITION_LABEL) as ScrewCondition[]).map(k => <option key={k} value={k}>{SCREW_CONDITION_LABEL[k]}</option>)}
      </HelperSelect>
      <HelperSelect id="ps-sel-nut" label="Tuerca" value={pick.nut ?? ''}
        onChange={v => update({ ...pick, nut: (v || undefined) as NutMaterial | undefined })}>
        <option value="">— elegir —</option>
        {(Object.keys(NUT_LABEL) as NutMaterial[]).map(k => <option key={k} value={k}>{NUT_LABEL[k]}</option>)}
      </HelperSelect>
      {missing && <div className="ps-msg is-warn">Combinación sin dato en la tabla</div>}
      {range && (
        <div className="ps-source">
          <Tex tex="f" /> = {fmtNum(range[0])} – {fmtNum(range[1])} (se usa el máximo para el par)
        </div>
      )}
    </>
  );
}

/* ── Rail ───────────────────────────────────────────────────────────────── */
const GROUP_ORDER: InputGroup[] = ['thread', 'load', 'friction', 'input', 'strength', 'nut'];

export default function ProblemRail({ system, state, dispatch, result }: Props) {
  const { cfg, selections } = state;
  const setCfg = (patch: Partial<ProblemConfig>) => dispatch({ type: 'config', patch });
  const [resetKey, setResetKey] = useState(0);

  const defs = visibleInputs(cfg);
  const lenUnit = getUnit(DEFAULT_UNITS[system].length);
  const angUnit = getUnit('deg');
  const calc: { id: 'dm' | 'dr' | 'h' | 'l' | 'lambda'; ang?: boolean }[] = [
    { id: 'dm' }, { id: 'dr' }, { id: 'h' }, { id: 'l' }, { id: 'lambda', ang: true },
  ];
  const calcRows = calc.filter(c => result.values[c.id] !== undefined);

  const groupExtras = (g: InputGroup): ReactNode => {
    if (g === 'thread') {
      return (
        <HelperSelect id="ps-sel-acme" label="Catálogo Acme" value={selections.acmeSize ?? ''}
          onChange={v => dispatch({ type: 'acme', sizeId: v || undefined })}>
          <option value="">— manual —</option>
          {ACME_SIZES.map(a => <option key={a.id} value={a.id}>{`${a.id}″ · ${a.tpi} hilos/in`}</option>)}
        </HelperSelect>
      );
    }
    if (g === 'friction') {
      return (
        <>
          <ThreadPairHelper state={state} dispatch={dispatch} />
          {cfg.thrust === 'collar' && (
            <HelperSelect id="ps-sel-collar" label="Pareja del collarín" value={selections.collarPair ?? ''}
              onChange={v => dispatch({ type: 'collarPair', pairId: v || undefined })}>
              <option value="">— manual —</option>
              {COLLAR_FRICTION.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </HelperSelect>
          )}
        </>
      );
    }
    if (g === 'strength') {
      return (
        <>
          <HelperSelect id="ps-sel-material" label="Material del tornillo" value={selections.screwMaterial ?? ''}
            onChange={v => dispatch({ type: 'material', materialId: v || undefined })}>
            <option value="">— manual —</option>
            {SCREW_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </HelperSelect>
          {cfg.load === 'compression' && (
            <HelperSelect id="ps-sel-end" label="Condición de extremos" value={selections.endCondition ?? ''}
              onChange={v => dispatch({ type: 'endCondition', conditionId: v || undefined })}>
              <option value="">— manual —</option>
              {END_CONDITIONS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </HelperSelect>
          )}
        </>
      );
    }
    return null;
  };

  return (
    <aside className="ps-rail ps-zone" aria-label="Datos del problema">
      <section className="ps-sec">
        <h2 className="ps-h2">Configuración</h2>

        <div className="ps-seg-legend">Transmisión</div>
        <div className="ps-cards">
          {TX_OPTIONS.map(o => (
            <button key={o.id} type="button" className="ps-card" aria-pressed={cfg.transmission === o.id}
              onClick={() => setCfg({ transmission: o.id })}>
              {o.draw}
              <span>{o.label}</span>
            </button>
          ))}
        </div>

        {cfg.transmission === 'lever' && (
          <Segmented legend="Palanca" value={cfg.leverHands}
            options={[{ value: 1 as const, label: 'Una mano' }, { value: 2 as const, label: 'Dos manos' }]}
            onChange={v => setCfg({ leverHands: v })} />
        )}

        <Segmented legend="Accionamiento" value={cfg.manualDrive}
          options={[{ value: true, label: 'Manual' }, { value: false, label: 'Con velocidad' }]}
          onChange={v => setCfg({ manualDrive: v })} />
        <p className="ps-goal-help">
          {cfg.manualDrive
            ? 'Tornillo girado a mano (gato, prensa): la presión admisible sale de la fila de baja velocidad, sin pedir la velocidad de giro.'
            : 'La presión admisible se elige según la velocidad de giro.'}
        </p>

        <Segmented legend="Forma de rosca" value={cfg.thread}
          options={[{ value: 'square' as const, label: 'Cuadrada' }, { value: 'acme' as const, label: 'Acme' }]}
          onChange={v => setCfg({ thread: v })} />

        <Segmented legend="Apoyo de empuje (opcional)" value={cfg.thrust}
          options={[{ value: 'none' as const, label: 'Ninguno' }, { value: 'collar' as const, label: 'Collarín' }, { value: 'bearing' as const, label: 'Rodamiento' }]}
          onChange={v => setCfg({ thrust: v })} />

        {cfg.thrust !== 'none' && (
          <Segmented legend="Par en el cuerpo" value={cfg.bodyTorque}
            options={[
              { value: 'total' as const, label: <>Total (<Tex tex="T_R + T_c" />)</> },
              { value: 'threadOnly' as const, label: <>Solo rosca (<Tex tex="T_R" />)</> },
            ]}
            onChange={v => setCfg({ bodyTorque: v })} />
        )}

        <Segmented legend="Carga" value={cfg.load}
          options={[{ value: 'compression' as const, label: 'Compresión' }, { value: 'tension' as const, label: 'Tensión' }]}
          onChange={v => setCfg({ load: v })} />

        <Segmented legend="Objetivo" columns={2} value={cfg.goal}
          options={[
            { value: 'analyze' as const, label: 'Analizar' }, { value: 'capacity' as const, label: 'Capacidad' },
            { value: 'drive' as const, label: 'Accionamiento' }, { value: 'size' as const, label: 'Dimensionar' },
            { value: 'lead' as const, label: 'Avance' },
          ]}
          onChange={v => setCfg({ goal: v })} />
        <p className="ps-goal-help">{GOAL_HELP[cfg.goal]} El objetivo solo orienta lo que se resalta.</p>

        {cfg.goal === 'size' && (
          <Segmented legend="Autobloqueo en el diseño" value={cfg.requireSelfLock}
            options={[{ value: true, label: 'Exigido' }, { value: false, label: 'No exigido' }]}
            onChange={v => setCfg({ requireSelfLock: v })} />
        )}
      </section>

      <section className="ps-sec" key={resetKey}>
        <h2 className="ps-h2">Datos</h2>
        {GROUP_ORDER.map(g => {
          const items = defs.filter(d => d.group === g);
          const extras = groupExtras(g);
          if (!items.length && !extras) return null;
          return (
            <div key={g} className="ps-group">
              <h3 className="ps-h3">{INPUT_GROUP_LABEL[g]}</h3>
              {extras}
              {items.map(d => <Field key={d.id} def={d} state={state} dispatch={dispatch} result={result} />)}
              {g === 'thread' && calcRows.length > 0 && (
                <div className="ps-calc">
                  <div className="ps-h3">Calculados</div>
                  {calcRows.map(c => {
                    const base = result.values[c.id]!;
                    const u = c.ang ? angUnit : lenUnit;
                    const val = c.ang ? base / angUnit.factor : fromBase(base, lenUnit.id);
                    return (
                      <div key={c.id} className="ps-field">
                        <div className="ps-field-head">
                          <span className="ps-field-label">
                            <Tex tex={varSymbol(c.id)} className="ps-tex ps-field-sym" />
                            <span>{varLabel(c.id)}</span>
                          </span>
                        </div>
                        <div className="ps-derived">
                          <span className="ps-derived-val">{fmtNum(val)}</span>
                          <Tex tex={u.label} className="ps-tex ps-derived-unit" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="ps-sec">
        <button type="button" className="ps-linkbtn"
          onClick={() => { dispatch({ type: 'reset', system }); setResetKey(k => k + 1); }}>
          Reiniciar
        </button>
      </div>
    </aside>
  );
}
