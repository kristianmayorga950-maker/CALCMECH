import { NUT_LOAD_SHARES } from '../../data/tables';
import { fmtNum } from '../../engine/format';
import Tex from '../Tex';
import Interpretation from './Interpretation';
import { NUT_INTERPRETATION } from '../../engine/interpret';

const MAX = NUT_LOAD_SHARES[0];

export default function NutLoadShare() {
  const cols = [1, 2, 3, 4, 5, 6, 7].map(n => {
    if (n <= 3) return { n, kind: 'data' as const, v: NUT_LOAD_SHARES[n - 1] };
    if (n <= 6) return { n, kind: 'nodata' as const, v: 0 };
    return { n, kind: 'free' as const, v: 0 };
  });
  const summary = 'Fracción de la carga por filete: filete 1, 0.38; filete 2, 0.25; filete 3, 0.18; filetes 4 a 6 sin dato individual, 0.19 entre los tres por diferencia; filete 7 libre de carga.';

  return (
    <figure className="ps-chart" aria-label={summary}>
      <figcaption className="ps-chart-cap">¿Por qué se calcula con <Tex tex="0.38\,F" /> en un filete? El primer filete lleva 0.38 de la carga; el séptimo queda libre.</figcaption>
      <div className="ps-bars" role="img" aria-label={summary}>
        {cols.map(c => (
          <div key={c.n} className="ps-bar-col"
            title={c.kind === 'data' ? `Filete ${c.n}: ${fmtNum(c.v)} de la carga` : c.kind === 'free' ? `Filete ${c.n}: libre de carga` : `Filete ${c.n}: sin dato`}>
            <div className="ps-bar-val">{c.kind === 'data' ? <Tex tex={`${fmtNum(c.v)}\\,F`} /> : ''}</div>
            <div className="ps-bar-area">
              {c.kind === 'data' && <div className="ps-bar-fill" style={{ height: `${(c.v / MAX) * 100}%` }} />}
              {c.kind === 'nodata' && <div className="ps-bar-empty"><span>sin dato</span></div>}
              {c.kind === 'free' && <span className="ps-bar-free">libre</span>}
            </div>
            <div className="ps-bar-n">{c.n}</div>
          </div>
        ))}
      </div>
      <div className="ps-chart-axis">filete (contado desde la cara cargada de la tuerca)</div>
      <p className="ps-bar-note">
        Filetes 4 a 6: <Tex tex="0.19\,F" /> entre los tres, por diferencia (1 − 0.38 − 0.25 − 0.18); no hay reparto individual.
      </p>
      <Interpretation text={NUT_INTERPRETATION} />
    </figure>
  );
}
