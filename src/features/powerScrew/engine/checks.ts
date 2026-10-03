/**
 * Verificaciones de diseño. Cada una devuelve el criterio, el valor calculado, el
 * requerido y una explicación en lenguaje de ingeniería. Sin umbrales inventados:
 * el factor de seguridad lo fija el usuario.
 */

import type { CheckDef, CheckOutcome } from './types';
import { fmtNum } from './format';

const sec = (a: number) => 1 / Math.cos(a);

export const CHECKS: CheckDef[] = [
  {
    id: 'torqueEq', label: 'Ecuación de par válida', inputs: ['dm', 'l', 'f', 'alpha'],
    evaluate: v => {
      const den = Math.PI * v.dm - v.f * v.l * sec(v.alpha);
      return {
        status: den > 0 ? 'ok' : 'fail', computed: den, required: 0,
        criterion: '\\pi d_m - f\\,l\\sec\\alpha > 0',
        explanation: den > 0
          ? 'La rosca puede subir la carga con un par finito.'
          : 'Con esta fricción y este avance la rosca se traba: no hay par finito que suba la carga.',
      };
    },
    origin: 'DERIVADA', ref: 'denominador de 8-1/8-5',
  },
  {
    id: 'selfLock', label: 'Autobloqueo de la rosca', inputs: ['f', 'lambda', 'alpha'],
    evaluate: v => {
      const usesMin = v.fMin !== undefined;
      const fUsed = usesMin ? v.fMin : v.f;
      const lhs = fUsed * sec(v.alpha), rhs = Math.tan(v.lambda);
      const locks = lhs > rhs;
      return {
        status: locks ? 'ok' : 'warn', computed: lhs, required: rhs,
        criterion: 'f\\sec\\alpha > \\tan\\lambda',
        explanation: (locks
          ? 'La carga no baja sola: la rosca es autobloqueante.'
          : 'La rosca no es autobloqueante: la carga puede bajar sola si nada la retiene (apoyo, freno o motor).')
          + (usesMin ? ` Se verificó con el extremo bajo de la fricción de la tabla (f = ${fmtNum(fUsed)}).` : ''),
      };
    },
    origin: 'SHIGLEY', ref: 'Ec. 8-3; con ángulo DERIVADA',
  },
  {
    id: 'hold', label: 'Retención con el apoyo', inputs: ['TL', 'Tc'],
    notApplicable: c => (c.thrust === 'none' ? 'Sin apoyo de empuje solo cuenta el autobloqueo de la rosca.' : null),
    evaluate: v => {
      const t = v.TL + v.Tc;
      return {
        status: t > 0 ? 'ok' : 'warn', computed: t, required: 0,
        criterion: 'T_L + T_c > 0',
        explanation: t > 0
          ? 'Aunque la rosca sola no bloquee, la fricción del apoyo retiene la carga.'
          : 'Ni la rosca ni el apoyo retienen la carga: hace falta un freno.',
      };
    },
    origin: 'SHIGLEY', ref: 'Ej. 8-1(b)',
  },
  {
    id: 'rootYield', label: 'Fluencia en la raíz del filete', inputs: ['vm', 'Sy', 'nTarget'],
    evaluate: v => nCheck(v.Sy / v.vm, v.nTarget, "n = \\dfrac{S_y}{\\sigma'} \\ge n_{obj}",
      'en la raíz del primer filete (estado combinado)'),
    origin: 'SHIGLEY', ref: 'Ec. 5-19 con σ′ de 5-14',
  },
  {
    id: 'bodyYield', label: 'Fluencia en el cuerpo', inputs: ['sigmaBodyVM', 'Sy', 'nTarget'],
    evaluate: v => nCheck(v.Sy / v.sigmaBodyVM, v.nTarget, "n = \\dfrac{S_y}{\\sigma'_{c}} \\ge n_{obj}",
      'en el núcleo del tornillo (axial más torsión)'),
    origin: 'SHIGLEY', ref: 'Ec. 5-15, 5-19',
  },
  {
    id: 'buckling', label: 'Pandeo del tornillo', inputs: ['Pcr', 'Fw', 'nTarget'],
    notApplicable: c => (c.load === 'tension' ? 'Con la carga en tensión el tornillo no pandea.' : null),
    evaluate: v => nCheck(v.Pcr / v.Fw, v.nTarget, 'n = \\dfrac{P_{cr}}{F} \\ge n_{obj}', 'frente al pandeo como columna'),
    origin: 'DERIVADA', ref: '4-44 / 4-46',
  },
  {
    id: 'wear', label: 'Desgaste de la rosca', inputs: ['sBw', 'pbEff'],
    evaluate: v => {
      const okk = v.sBw <= v.pbEff;
      return {
        status: okk ? 'ok' : 'fail', computed: v.sBw, required: v.pbEff,
        criterion: '\\sigma_{B,t} \\le p_b',
        explanation: okk
          ? 'La presión entre filetes está dentro de lo admisible para no desgastar la tuerca.'
          : 'La presión entre filetes supera lo admisible: alargue la tuerca (más filetes) o aumente el diámetro.',
      };
    },
    origin: 'SHIGLEY', ref: 'Tabla 8-4',
  },
  {
    id: 'inputEnough', label: 'Entrada suficiente', inputs: ['Tavail', 'T'],
    notApplicable: (_c, given) =>
      given.has('F') && (given.has('Tin') || given.has('P') || given.has('r') || given.has('Tm'))
        ? null
        : 'Se evalúa cuando se dan la carga y también lo que se aplica en la entrada.',
    evaluate: v => {
      const okk = v.Tavail >= v.T;
      return {
        status: okk ? 'ok' : 'fail', computed: v.Tavail, required: v.T,
        criterion: 'T_{ent} \\ge T',
        explanation: okk
          ? 'Lo aplicado en la entrada alcanza para subir la carga.'
          : 'Lo aplicado en la entrada no alcanza para subir la carga.',
      };
    },
    origin: 'ESTATICA', ref: 'comparación',
  },
];

function nCheck(n: number, target: number, criterion: string, where: string): CheckOutcome {
  const okk = n >= target;
  return {
    status: okk ? 'ok' : 'fail', computed: n, required: target, criterion,
    explanation: okk
      ? `El factor de seguridad ${where} cumple el objetivo.`
      : `El factor de seguridad ${where} queda por debajo del objetivo.`,
  };
}
