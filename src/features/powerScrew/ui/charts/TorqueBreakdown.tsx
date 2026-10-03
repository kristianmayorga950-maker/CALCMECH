import type { EngineResult } from '../../engine/types';
import { fmtNum } from '../../engine/format';
import Tex from '../Tex';
import Interpretation from './Interpretation';
import { interpretTorque } from '../../engine/interpret';

const NM = '\\mathrm{N\\cdot m}';

export default function TorqueBreakdown({ result }: { result: EngineResult }) {
  const { T0, TR, Tc } = result.values;
  if (T0 === undefined || TR === undefined || result.values.T === undefined) return null;

  const segs = [
    { key: 's1', sym: 'T_0', name: 'trabajo útil', v: T0 },
    { key: 's2', sym: 'T_R - T_0', name: 'fricción de la rosca', v: Math.max(0, TR - T0) },
    ...(Tc !== undefined ? [{ key: 's3', sym: 'T_c', name: 'apoyo', v: Tc }] : []),
  ];
  const total = segs.reduce((a, s) => a + s.v, 0);
  if (!(total > 0)) return null;
  const pct = (v: number) => (v / total) * 100;
  const summary = segs.map(s => `${s.name} ${fmtNum(s.v / 1000)} N·m (${fmtNum(pct(s.v))} %)`).join('; ');

  return (
    <figure className="ps-chart" aria-label={`Reparto del par para subir: ${summary}`}>
      <figcaption className="ps-chart-cap">¿A dónde se va el par? Cada tramo es la parte del par total que se gasta en ese fin.</figcaption>
      <div className="ps-stack" role="img" aria-label={`Reparto del par para subir: ${summary}`}>
        {segs.map(s => (
          <div key={s.key} className={'ps-stack-seg ps-' + s.key}
            style={{ flexGrow: s.v, flexBasis: 0 }}
            title={`${s.name}: ${fmtNum(s.v / 1000)} N·m (${fmtNum(pct(s.v))} %)`}>
            {pct(s.v) >= 10 && <span>{fmtNum(pct(s.v))} %</span>}
          </div>
        ))}
      </div>
      <ul className="ps-legend">
        {segs.map(s => (
          <li key={s.key} className="ps-legend-item">
            <span className={'ps-swatch ps-' + s.key} aria-hidden="true" />
            <span className="ps-legend-name"><Tex tex={s.sym} /> {s.name}</span>
            <span className="ps-legend-val"><Tex tex={`${fmtNum(s.v / 1000)}\\ ${NM}`} /> · {fmtNum(pct(s.v))} %</span>
          </li>
        ))}
      </ul>
      <Interpretation text={interpretTorque(result)} />
    </figure>
  );
}
