/**
 * Interpretación en una o dos frases de cada gráfico, calculada con los datos del
 * usuario. Texto llano (sin símbolos con subíndice ni referencias). Puro.
 */

import type { CheckResult, EngineResult, ProblemConfig } from './types';
import { efficiencyAt, lockingLeadAngle, utilization } from './summary';
import { fmtNum } from './format';

const pct = (x: number) => `${fmtNum(x * 100, 3)} %`;
const deg = (rad: number) => `${fmtNum((rad * 180) / Math.PI, 3)}°`;

export function interpretTorque(r: EngineResult): string | null {
  const { T0, TR, Tc } = r.values;
  if (T0 === undefined || TR === undefined) return null;
  const thread = Math.max(0, TR - T0), collar = Tc ?? 0;
  const total = T0 + thread + collar;
  if (!(total > 0)) return null;
  const lost = (thread + collar) / total;
  let s = `Solo el ${pct(T0 / total)} del par sube la carga; el ${pct(lost)} se pierde en fricción`;
  if (Tc !== undefined) {
    s += ` (${pct(collar / total)} en el apoyo y ${pct(thread / total)} en la rosca).`;
    s += collar > thread
      ? ' La mayor pérdida está en el apoyo, no en la rosca.'
      : ' La mayor pérdida está en la rosca.';
  } else {
    s += ' en la rosca.';
  }
  return s;
}

export function interpretEfficiency(r: EngineResult, cfg: ProblemConfig): string | null {
  const { lambda, alpha } = r.values;
  const f = r.values.fMin ?? r.values.f;
  if (lambda === undefined || alpha === undefined || f === undefined) return null;
  const lamLock = lockingLeadAngle(f, alpha);
  const eNow = efficiencyAt(lambda, f, alpha);
  const eLock = efficiencyAt(lamLock, f, alpha);
  if (eNow === null || eLock === null) return null;
  const fric = r.values.fMin !== undefined ? ' (con la fricción más baja de la tabla)' : '';
  if (lambda < lamLock) {
    return `El ángulo de avance (${deg(lambda)}) está por debajo de la frontera de autobloqueo (${deg(lamLock)})${fric}: ` +
      `la carga se sostiene sola. La rosca rinde ${pct(eNow)}; podría llegar hasta ${pct(eLock)} con más avance sin perder el autobloqueo.`;
  }
  const extra = cfg.thrust !== 'none' ? ' El apoyo puede retener la carga aunque la rosca no lo haga.' : '';
  return `El ángulo de avance (${deg(lambda)}) supera la frontera de autobloqueo (${deg(lamLock)})${fric}: ` +
    `la rosca sola no sostiene la carga. Para que bloquee habría que bajar el ángulo de avance (menos avance o más diámetro medio), ` +
    `y su eficiencia bajaría de ${pct(eNow)} a menos de ${pct(eLock)}.${extra}`;
}

export function interpretUtilization(checks: readonly CheckResult[], cfg: ProblemConfig): string | null {
  const rows = checks
    .filter(c => c.status === 'ok' || c.status === 'fail' || c.status === 'warn')
    .filter(c => !(c.id === 'selfLock' && !cfg.requireSelfLock))
    .map(c => ({ c, u: utilization(c) }))
    .filter((x): x is { c: CheckResult; u: number } => x.u !== undefined && Number.isFinite(x.u))
    .sort((a, b) => b.u - a.u);
  if (!rows.length) return null;
  const [g, next] = rows;
  let s = g.u <= 1
    ? `Gobierna «${g.c.label}»: usa el ${pct(g.u)} de su capacidad.`
    : `Falla «${g.c.label}»: pide el ${pct(g.u)} de su capacidad.`;
  if (next) s += ` Le sigue «${next.c.label}» con ${pct(next.u)}.`;
  if (g.u <= 1) s += ' Mejorar los demás criterios no cambia el margen del diseño.';
  return s;
}

export const NUT_INTERPRETATION =
  'Al subir la carga, el tornillo trabaja a compresión y su paso se acorta, mientras la tuerca trabaja a tensión y su paso se alarga. ' +
  'Los pasos dejan de coincidir y el primer filete toma la mayor parte. ' +
  'Por eso el esfuerzo máximo del filete se calcula con 0.38 de la carga sobre un solo filete. ' +
  'Alargar la tuerca reduce la presión media (desgaste), pero no alivia ese primer filete.';
