import type { CheckStatus } from '../engine/types';
import type { SizingResult } from '../engine/sizing';
import { fmtNum } from '../engine/format';
import type { Action } from '../state/problemState';
import Tex from './Tex';

const COLS: { id: string; label: string; margin: boolean }[] = [
  { id: 'rootYield', label: 'Raíz', margin: true },
  { id: 'bodyYield', label: 'Cuerpo', margin: true },
  { id: 'buckling', label: 'Pandeo', margin: true },
  { id: 'wear', label: 'Desgaste', margin: false },
  { id: 'selfLock', label: 'Autobloqueo', margin: false },
  { id: 'torqueEq', label: 'Par válido', margin: false },
];

const WORD: Record<CheckStatus, { w: string; cls: string }> = {
  ok:      { w: 'cumple',    cls: 'is-ok' },
  fail:    { w: 'no cumple', cls: 'is-fail' },
  warn:    { w: 'atención',  cls: 'is-warn' },
  pending: { w: 'pendiente', cls: 'is-pend' },
  na:      { w: 'n/a',       cls: 'is-pend' },
};

export default function SizingTable({ sizing, dispatch }: { sizing: SizingResult; dispatch: (a: Action) => void }) {
  const cols = COLS.filter(c => sizing.candidates.some(k => k.checks[c.id] !== undefined));
  const hasNt = sizing.candidates.some(k => k.ntMin !== undefined);
  const rec = sizing.candidates.find(k => k.id === sizing.recommendedId);

  const useRecommended = () => {
    if (!rec) return;
    dispatch({ type: 'acme', sizeId: rec.id, keepThread: true });
    if (rec.ntMin !== undefined) dispatch({ type: 'value', id: 'nt', value: rec.ntMin });
    dispatch({ type: 'config', patch: { goal: 'analyze' } });
  };

  return (
    <section className="ps-stage" aria-label="Dimensionamiento">
      <header className="ps-stage-head">
        <h2 className="ps-h2">Dimensionamiento</h2>
        <span className="ps-stage-status">{sizing.candidates.length} tamaños probados</span>
      </header>
      <div className="ps-sheet">
        {sizing.drStart !== undefined && (
          <p className="ps-size-start">
            Punto de partida por compresión:{' '}
            <Tex tex={`d_r \\ge \\sqrt{\\dfrac{4 F n_{obj}}{\\pi S_y}} = ${fmtNum(sizing.drStart)}\\ \\mathrm{mm}`} />
          </p>
        )}

        <div className="ps-table-wrap">
          <table className="ps-table">
            <caption className="ps-sr">Tamaños del catálogo y resultado de cada verificación</caption>
            <thead>
              <tr>
                <th scope="col">Tamaño</th>
                <th scope="col"><Tex tex="d\ (\mathrm{mm})" /></th>
                <th scope="col"><Tex tex="p\ (\mathrm{mm})" /></th>
                <th scope="col"><Tex tex="d_r\ (\mathrm{mm})" /></th>
                {cols.map(c => <th key={c.id} scope="col">{c.label}</th>)}
                {hasNt && <th scope="col"><Tex tex="n_t" /> mín</th>}
                {hasNt && <th scope="col"><Tex tex="H\ (\mathrm{mm})" /></th>}
                <th scope="col">Veredicto</th>
              </tr>
            </thead>
            <tbody>
              {sizing.candidates.map(k => {
                const isRec = k.id === sizing.recommendedId;
                return (
                  <tr key={k.id} className={isRec ? 'is-rec' : undefined}>
                    <th scope="row">{k.id}″</th>
                    <td>{fmtNum(k.d)}</td>
                    <td>{fmtNum(k.p)}</td>
                    <td>{k.dr !== undefined ? fmtNum(k.dr) : '—'}</td>
                    {cols.map(c => {
                      const st = k.checks[c.id];
                      if (st === undefined) return <td key={c.id}>—</td>;
                      const m = k.margins[c.id];
                      return (
                        <td key={c.id}>
                          <span className={'ps-status ' + WORD[st].cls}>{WORD[st].w}</span>
                          {c.margin && m !== undefined && <span className="ps-margin"> {fmtNum(m)}</span>}
                        </td>
                      );
                    })}
                    {hasNt && <td>{k.ntMin ?? '—'}</td>}
                    {hasNt && <td>{k.H !== undefined ? fmtNum(k.H) : '—'}</td>}
                    <td>
                      {isRec
                        ? <strong className="ps-rec">recomendado</strong>
                        : k.passes ? 'cumple'
                        : k.failedBy ? `descartado: ${k.failedBy}` : 'sin evaluar'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sizing.notEvaluated.length > 0 && (
          <p className="ps-pending">No se evaluó: {sizing.notEvaluated.join(', ')}.</p>
        )}
        {!rec && (
          <p className="ps-pending">
            {sizing.candidates.length === 0
              ? 'No hay tamaños candidatos.'
              : 'Ningún tamaño del catálogo cumple todas las verificaciones evaluables; revisa los datos o relaja un criterio.'}
          </p>
        )}
        {rec && (
          <button type="button" className="ps-btn" onClick={useRecommended}>Usar el tamaño recomendado</button>
        )}
      </div>
    </section>
  );
}
