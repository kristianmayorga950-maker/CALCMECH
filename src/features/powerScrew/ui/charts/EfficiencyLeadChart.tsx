import { useMemo, useRef, useState } from 'react';
import type { EngineResult, ProblemConfig } from '../../engine/types';
import { efficiencyAt, lockingLeadAngle } from '../../engine/summary';
import { fmtNum } from '../../engine/format';
import Tex from '../Tex';
import Interpretation from './Interpretation';
import { interpretEfficiency } from '../../engine/interpret';

const W = 560, H = 260;
const ML = 46, MR = 16, MT = 14, MB = 42;
const PW = W - ML - MR, PH = H - MT - MB;
const X_MAX = 40, X_MIN_DATA = 0.5;
const DEG = Math.PI / 180;

const xPix = (deg: number) => ML + (deg / X_MAX) * PW;
const yPix = (e: number) => MT + (1 - e) * PH;

function pathOf(f: (deg: number) => number | null): string {
  let d = '';
  let pen = false;
  for (let i = 0; i <= 160; i++) {
    const deg = X_MIN_DATA + (i / 160) * (X_MAX - X_MIN_DATA);
    const e = f(deg);
    if (e === null || e < 0) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${xPix(deg).toFixed(1)} ${yPix(Math.min(1, e)).toFixed(1)} `;
    pen = true;
  }
  return d;
}

export default function EfficiencyLeadChart({ result, cfg }: { result: EngineResult; cfg: ProblemConfig }) {
  const { lambda, alpha, fc, dc, dm } = result.values;
  const f = result.values.fMin ?? result.values.f;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const hasCollar = cfg.thrust !== 'none' && fc !== undefined && dc !== undefined && dm !== undefined && dm > 0;
  const collar = hasCollar ? { fc: fc!, dcOverDm: dc! / dm! } : undefined;

  const model = useMemo(() => {
    if (lambda === undefined || f === undefined || alpha === undefined) return null;
    const e1 = (deg: number) => efficiencyAt(deg * DEG, f, alpha);
    const e2 = collar ? (deg: number) => efficiencyAt(deg * DEG, f, alpha, collar) : null;
    return {
      e1, e2,
      p1: pathOf(e1),
      p2: e2 ? pathOf(e2) : '',
      lock: lockingLeadAngle(f, alpha) / DEG,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lambda, f, alpha, collar?.fc, collar?.dcOverDm]);

  if (!model || lambda === undefined || f === undefined || alpha === undefined) return null;
  const { e1, e2, p1, p2, lock } = model;

  const lamDeg = lambda / DEG;
  const inRange = lamDeg >= X_MIN_DATA && lamDeg <= X_MAX;
  const d1 = inRange ? e1(lamDeg) : null;
  const d2 = inRange && e2 ? e2(lamDeg) : null;
  const pctTxt = (e: number) => `${fmtNum(e * 100)} %`;

  const lockInRange = lock > 0 && lock <= X_MAX;
  const xLock = xPix(Math.min(lock, X_MAX));
  const shadeW = xLock - ML;

  const onMove = (ev: React.MouseEvent<HTMLDivElement>) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    const vx = ((ev.clientX - r.left) / r.width) * W;
    const deg = ((vx - ML) / PW) * X_MAX;
    setHover(Math.round(Math.max(X_MIN_DATA, Math.min(X_MAX, deg)) * 10) / 10);
  };

  const h1 = hover !== null ? e1(hover) : null;
  const h2 = hover !== null && e2 ? e2(hover) : null;

  const summary = [
    `Eficiencia contra ángulo de avance, de ${X_MIN_DATA} a ${X_MAX} grados.`,
    `Frontera de autobloqueo en ${fmtNum(lock)} grados.`,
    d1 !== null ? `Diseño: ángulo de avance ${fmtNum(lamDeg)} grados, eficiencia de la rosca ${pctTxt(d1)}` : '',
    d2 !== null ? `, eficiencia global ${pctTxt(d2)}.` : '.',
  ].join(' ');

  // Etiquetas del punto de diseño: a la derecha si cabe, si no a la izquierda.
  const right = lamDeg < X_MAX * 0.6;
  const anchor = right ? 'start' : 'end';
  const dx = right ? 10 : -10;

  return (
    <figure className="ps-chart" aria-label={summary}>
      <figcaption className="ps-chart-cap">
        ¿Cuánta eficiencia se gana o se pierde con el autobloqueo? Eficiencia contra ángulo de avance <Tex tex="\lambda" />.
      </figcaption>
      <div className="ps-eff" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="ps-eff-svg" role="img" aria-label={summary}>
          {/* rejilla y ejes */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <g key={t}>
              <line className="ps-ch-grid" x1={ML} x2={ML + PW} y1={yPix(t)} y2={yPix(t)} />
              <text className="ps-ch-tick" x={ML - 6} y={yPix(t) + 3.5} textAnchor="end">{t}</text>
            </g>
          ))}
          {[0, 10, 20, 30, 40].map(t => (
            <g key={t}>
              <line className="ps-ch-axis" x1={xPix(t)} x2={xPix(t)} y1={MT + PH} y2={MT + PH + 4} />
              <text className="ps-ch-tick" x={xPix(t)} y={MT + PH + 16} textAnchor="middle">{t}</text>
            </g>
          ))}
          <line className="ps-ch-axis" x1={ML} x2={ML + PW} y1={MT + PH} y2={MT + PH} />
          <line className="ps-ch-axis" x1={ML} x2={ML} y1={MT} y2={MT + PH} />
          <foreignObject x={ML + PW / 2 - 30} y={H - 22} width="60" height="22">
            <div className="ps-ch-axtitle"><Tex tex="\lambda\ (^{\circ})" /></div>
          </foreignObject>
          <foreignObject x={2} y={MT + PH / 2 - 11} width="24" height="22">
            <div className="ps-ch-axtitle"><Tex tex="e" /></div>
          </foreignObject>

          {/* región autobloqueante */}
          {lockInRange && (
            <>
              <rect x={ML} y={MT} width={shadeW} height={PH} fill="var(--p-ok)" opacity="0.1" />
              <line className="ps-ch-lock" x1={xLock} x2={xLock} y1={MT} y2={MT + PH} />
              <text className="ps-ch-lbl" x={xLock + 5} y={MT + 11}>frontera de autobloqueo</text>
              <text className="ps-ch-lbl" x={ML + 5} y={MT + PH - 6}>autobloqueante</text>
            </>
          )}

          {/* curvas */}
          <path d={p1} fill="none" stroke="var(--p-s1)" strokeWidth="2" strokeLinejoin="round" />
          {e2 && <path d={p2} fill="none" stroke="var(--p-s2)" strokeWidth="2" strokeLinejoin="round" />}

          {/* etiquetas directas de las series */}
          <text className="ps-ch-lbl" x={xPix(X_MAX) - 4} y={yPix(e1(X_MAX) ?? 0.9) - 7} textAnchor="end">rosca</text>
          {e2 && <text className="ps-ch-lbl" x={xPix(X_MAX) - 4} y={yPix(e2(X_MAX) ?? 0.5) - 7} textAnchor="end">global (con apoyo)</text>}

          {/* punto de diseño */}
          {d1 !== null && (
            <g>
              <circle cx={xPix(lamDeg)} cy={yPix(d1)} r="5" fill="var(--p-s1)" stroke="var(--p-paper)" strokeWidth="2" />
              <text className="ps-ch-lbl is-bold" x={xPix(lamDeg) + dx} y={yPix(d1) - 8} textAnchor={anchor}>diseño: e = {pctTxt(d1)}</text>
            </g>
          )}
          {d2 !== null && (
            <g>
              <circle cx={xPix(lamDeg)} cy={yPix(d2)} r="5" fill="var(--p-s2)" stroke="var(--p-paper)" strokeWidth="2" />
              <text className="ps-ch-lbl is-bold" x={xPix(lamDeg) + dx} y={yPix(d2) + 16} textAnchor={anchor}>diseño: e = {pctTxt(d2)}</text>
            </g>
          )}

          {/* cruz del cursor */}
          {hover !== null && (
            <line className="ps-ch-cross" x1={xPix(hover)} x2={xPix(hover)} y1={MT} y2={MT + PH} />
          )}
        </svg>
        {hover !== null && (
          <div className="ps-ch-tip" style={{ left: `${(xPix(hover) / W) * 100}%` }} role="presentation"
            data-flip={hover > X_MAX * 0.6 ? 'left' : 'right'}>
            <div><Tex tex={`\\lambda = ${fmtNum(hover)}\\,^{\\circ}`} /></div>
            <div><span className="ps-swatch ps-s1" aria-hidden="true" /> rosca: {h1 !== null ? pctTxt(h1) : 'trabada'}</div>
            {e2 && <div><span className="ps-swatch ps-s2" aria-hidden="true" /> global: {h2 !== null ? pctTxt(h2) : 'trabada'}</div>}
          </div>
        )}
      </div>
      <ul className="ps-legend">
        <li className="ps-legend-item"><span className="ps-swatch ps-s1" aria-hidden="true" /> <span className="ps-legend-name">eficiencia de la rosca</span></li>
        {e2 && <li className="ps-legend-item"><span className="ps-swatch ps-s2" aria-hidden="true" /> <span className="ps-legend-name">eficiencia global (rosca y apoyo)</span></li>}
      </ul>
      <p className="ps-sr">{summary}</p>
      <Interpretation text={interpretEfficiency(result, cfg)} />
    </figure>
  );
}
