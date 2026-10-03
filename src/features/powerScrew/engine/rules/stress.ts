/** Autobloqueo (avance máximo), esfuerzos en el cuerpo y en la raíz, pandeo, desgaste y cinemática. */

import type { Rule } from '../types';
import { BEARING_PRESSURE, psiToMPa } from '../../data/tables';
import { no, ok, Q } from './util';

const FTMIN = 304.8 / 60; // mm/s por ft/min

/** Esfuerzos principales del estado en la raíz (σx principal; y–z en plano). */
function principals(sx: number, sy: number, tyz: number): [number, number, number] {
  const c = sy / 2, r = Math.hypot(c, tyz);
  return [sx, c + r, c - r].sort((a, b) => b - a) as [number, number, number];
}

const principalLatex = {
  general: () => '\\sigma_{y,z} = \\dfrac{\\sigma_y}{2} \\pm \\sqrt{\\left(\\dfrac{\\sigma_y}{2}\\right)^2 + \\tau_{yz}^2},\\quad \\sigma_x\\ \\text{es principal}',
};

export const stressRules: Rule[] = [
  // ── Autobloqueo: avance máximo ──
  {
    id: 'lmax', target: 'lmax', stage: 'locking', inputs: ['f', 'dm', 'alpha'],
    compute: v => ok(Math.PI * (v.fMin ?? v.f) * v.dm * Math.cos(v.alpha)),
    latex: {
      general: c => (c.thread === 'acme' ? 'l_{máx} = \\pi f d_m \\cos\\alpha' : 'l_{máx} = \\pi f d_m'),
      substituted: (v, c, f) => `l_{máx} = \\pi(${f('f', v.fMin ?? v.f!)})(${f('dm', v.dm!)})${c.thread === 'acme' ? '\\cos 14.5^{\\circ}' : ''}`,
    },
    note: 'Mayor avance que conserva el autobloqueo (con el extremo bajo de la fricción si viene de tabla).',
    origin: 'DERIVADA', ref: 'despeje de Ec. 8-3 (con ángulo: T_L > 0)',
  },
  {
    id: 'nmax', target: 'nmax', stage: 'locking', inputs: ['lmax', 'p'],
    compute: v => ok(Math.floor(v.lmax / v.p + 1e-9)),
    latex: {
      general: () => 'n_{máx} = \\left\\lfloor \\dfrac{l_{máx}}{p} \\right\\rfloor',
      substituted: (v, _c, f) => `n_{máx} = \\left\\lfloor \\dfrac{${f('lmax', v.lmax!)}}{${f('p', v.p!)}} \\right\\rfloor`,
    },
    note: 'Si sale 0, ni siquiera una rosca sencilla es autobloqueante con esta fricción.',
    origin: 'DERIVADA', ref: 'l = n p',
  },

  // ── Cuerpo ──
  {
    id: 'tau-total', target: 'tau', stage: 'body', inputs: ['T', 'dr'], applies: c => c.bodyTorque === 'total',
    compute: v => ok((16 * v.T) / (Math.PI * v.dr ** 3)),
    latex: {
      general: () => '\\tau = \\dfrac{16\\,T}{\\pi d_r^{3}}',
      substituted: (v, _c, f) => `\\tau = \\dfrac{16(${f('T', v.T!)})}{\\pi(${f('dr', v.dr!)})^{3}}`,
    },
    note: 'Con el par total (rosca + apoyo) actuando sobre el cuerpo.',
    origin: 'SHIGLEY', ref: 'Ec. 8-7; Ej. 8-1(d)',
  },
  {
    id: 'tau-thread', target: 'tau', stage: 'body', inputs: ['TR', 'dr'], applies: c => c.bodyTorque === 'threadOnly',
    compute: v => ok((16 * v.TR) / (Math.PI * v.dr ** 3)),
    latex: {
      general: () => '\\tau = \\dfrac{16\\,T_R}{\\pi d_r^{3}}',
      substituted: (v, _c, f) => `\\tau = \\dfrac{16(${f('TR', v.TR!)})}{\\pi(${f('dr', v.dr!)})^{3}}`,
    },
    note: 'Solo con el par de la rosca (el apoyo está del lado de la carga).',
    origin: 'SHIGLEY', ref: 'Ec. 8-7',
  },
  {
    id: 'sigma', target: 'sigma', stage: 'body', inputs: ['Fw', 'dr'],
    compute: (v, c) => ok(((c.load === 'compression' ? -4 : 4) * v.Fw) / (Math.PI * v.dr ** 2)),
    latex: {
      general: c => (c.load === 'compression' ? '\\sigma = -\\dfrac{4F}{\\pi d_r^{2}}' : '\\sigma = \\dfrac{4F}{\\pi d_r^{2}}'),
      substituted: (v, c, f) => `\\sigma = ${c.load === 'compression' ? '-' : ''}\\dfrac{4(${f('Fw', v.Fw!)})}{\\pi(${f('dr', v.dr!)})^{2}}`,
    },
    note: 'Negativo en compresión.',
    origin: 'SHIGLEY', ref: 'Ec. 8-8',
  },
  {
    id: 'sigmaBodyVM', target: 'sigmaBodyVM', stage: 'body', inputs: ['sigma', 'tau'],
    compute: v => ok(Math.sqrt(v.sigma ** 2 + 3 * v.tau ** 2)),
    latex: {
      general: () => "\\sigma'_{c} = \\sqrt{\\sigma^{2} + 3\\tau^{2}}",
      substituted: (v, _c, f) => `\\sigma'_{c} = \\sqrt{(${f('sigma', v.sigma!)})^{2} + 3(${f('tau', v.tau!)})^{2}}`,
    },
    origin: 'SHIGLEY', ref: 'Ec. 5-15',
  },

  // ── Rosca: primer filete con 0.38F ──
  {
    id: 'sB1', target: 'sB1', stage: 'thread', inputs: ['Fw', 'dm', 'p'],
    compute: v => ok((-2 * Q * v.Fw) / (Math.PI * v.dm * v.p)),
    latex: {
      general: () => '\\sigma_B = -\\dfrac{2(0.38F)}{\\pi d_m (1)\\, p}',
      substituted: (v, _c, f) => `\\sigma_B = -\\dfrac{2(0.38)(${f('Fw', v.Fw!)})}{\\pi(${f('dm', v.dm!)})(1)(${f('p', v.p!)})}`,
    },
    note: 'El primer filete en contacto lleva 0.38 de la carga; se toma un filete para el esfuerzo máximo.',
    origin: 'SHIGLEY', ref: 'Ec. 8-10 con 0.38F, n_t = 1',
  },
  {
    id: 'sb1', target: 'sb1', stage: 'thread', inputs: ['Fw', 'dr', 'p'],
    compute: v => ok((6 * Q * v.Fw) / (Math.PI * v.dr * v.p)),
    latex: {
      general: () => '\\sigma_b = \\dfrac{6(0.38F)}{\\pi d_r (1)\\, p}',
      substituted: (v, _c, f) => `\\sigma_b = \\dfrac{6(0.38)(${f('Fw', v.Fw!)})}{\\pi(${f('dr', v.dr!)})(1)(${f('p', v.p!)})}`,
    },
    note: 'Flexión en la raíz del filete.',
    origin: 'SHIGLEY', ref: 'Ec. 8-11 con 0.38F, n_t = 1',
  },
  {
    id: 'tr1', target: 'tr1', stage: 'thread', inputs: ['Fw', 'dr', 'p'],
    compute: v => ok((3 * Q * v.Fw) / (Math.PI * v.dr * v.p)),
    latex: {
      general: () => '\\tau_r = \\dfrac{3(0.38F)}{\\pi d_r (1)\\, p}',
      substituted: (v, _c, f) => `\\tau_r = \\dfrac{3(0.38)(${f('Fw', v.Fw!)})}{\\pi(${f('dr', v.dr!)})(1)(${f('p', v.p!)})}`,
    },
    note: 'En el centro de la raíz; en la parte superior de la raíz es cero.',
    origin: 'SHIGLEY', ref: 'Ec. 8-12 con 0.38F, n_t = 1',
  },
  {
    id: 'vm', target: 'vm', stage: 'thread', inputs: ['sb1', 'sigma', 'tau'],
    compute: v => {
      const sx = v.sb1, sy = v.sigma, sz = 0, tyz = v.tau;
      return ok(Math.SQRT1_2 * Math.sqrt((sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2 + 6 * tyz ** 2));
    },
    latex: {
      general: () => "\\sigma' = \\dfrac{1}{\\sqrt{2}}\\left[(\\sigma_x-\\sigma_y)^{2}+(\\sigma_y-\\sigma_z)^{2}+(\\sigma_z-\\sigma_x)^{2}+6\\tau_{yz}^{2}\\right]^{1/2}",
      substituted: (v, _c, f) =>
        `\\sigma' = \\dfrac{1}{\\sqrt{2}}\\left[(${f('sb1', v.sb1!)} - ${f('sigma', v.sigma!)})^{2} + (${f('sigma', v.sigma!)} - 0)^{2} + (0 - ${f('sb1', v.sb1!)})^{2} + 6(${f('tau', v.tau!)})^{2}\\right]^{1/2}`,
    },
    note: 'En la parte superior de la raíz: σx es la flexión, σy el axial del cuerpo y τyz la torsión.',
    origin: 'SHIGLEY', ref: '§8-2 estado en la raíz; Ec. 5-14',
  },
  ...(['s1', 's2', 's3'] as const).map((id, i): Rule => ({
    id, target: id, stage: 'thread', inputs: ['sb1', 'sigma', 'tau'],
    compute: v => ok(principals(v.sb1, v.sigma, v.tau)[i]),
    latex: {
      general: principalLatex.general,
      substituted: (v, _c, f) => `\\sigma_{${i + 1}} = ${f(id, principals(v.sb1!, v.sigma!, v.tau!)[i])}`,
    },
    hidden: i > 0,
    note: i === 0 ? 'Esfuerzos principales ordenados σ1 ≥ σ2 ≥ σ3.' : undefined,
    origin: 'SHIGLEY', ref: 'Ec. 3-13; Ej. 8-1(g)',
  })),
  {
    id: 'tmax', target: 'tmax', stage: 'thread', inputs: ['s1', 's3'],
    compute: v => ok((v.s1 - v.s3) / 2),
    latex: {
      general: () => '\\tau_{máx} = \\dfrac{\\sigma_1 - \\sigma_3}{2}',
      substituted: (v, _c, f) => `\\tau_{máx} = \\dfrac{${f('s1', v.s1!)} - ${f('s3', v.s3!)}}{2}`,
    },
    origin: 'SHIGLEY', ref: 'Ec. 3-16; Ej. 8-1(h)',
  },

  // ── Pandeo (solo compresión) ──
  {
    id: 'k', target: 'k', stage: 'buckling', inputs: ['dr'], applies: c => c.load === 'compression',
    compute: v => ok(v.dr / 4),
    latex: { general: () => 'k = \\dfrac{d_r}{4}', substituted: (v, _c, f) => `k = \\dfrac{${f('dr', v.dr!)}}{4}` },
    note: 'Radio de giro de la sección circular del núcleo.',
    origin: 'SHIGLEY', ref: 'Ej. 4-16(a)',
  },
  {
    id: 'slender', target: 'slender', stage: 'buckling', inputs: ['Lcol', 'k'], applies: c => c.load === 'compression',
    compute: v => ok(v.Lcol / v.k),
    latex: { general: () => '\\dfrac{L}{k}', substituted: (v, _c, f) => `\\dfrac{L}{k} = \\dfrac{${f('Lcol', v.Lcol!)}}{${f('k', v.k!)}}` },
    origin: 'SHIGLEY', ref: '§4-12',
  },
  {
    id: 'slender1', target: 'slender1', stage: 'buckling', inputs: ['C', 'E', 'Sy'], applies: c => c.load === 'compression',
    compute: v => ok(Math.sqrt((2 * Math.PI ** 2 * v.C * v.E) / v.Sy)),
    latex: {
      general: () => '\\left(\\dfrac{L}{k}\\right)_1 = \\left(\\dfrac{2\\pi^{2} C E}{S_y}\\right)^{1/2}',
      substituted: (v, _c, f) => `\\left(\\dfrac{L}{k}\\right)_1 = \\left(\\dfrac{2\\pi^{2}(${f('C', v.C!)})(${f('E', v.E!)})}{${f('Sy', v.Sy!)}}\\right)^{1/2}`,
    },
    note: 'Por encima de este valor se usa Euler; por debajo, Johnson.',
    origin: 'SHIGLEY', ref: 'Ec. 4-45',
  },
  {
    id: 'Pcr-euler', target: 'Pcr', stage: 'buckling', inputs: ['slender', 'slender1', 'C', 'E', 'dr'],
    applies: c => c.load === 'compression',
    compute: v => (v.slender > v.slender1
      ? ok(((Math.PI * v.dr ** 2) / 4) * (v.C * Math.PI ** 2 * v.E) / v.slender ** 2)
      : no('Columna corta: corresponde la fórmula de Johnson.')),
    latex: {
      general: () => 'P_{cr} = A\\,\\dfrac{C\\pi^{2}E}{(L/k)^{2}},\\quad A = \\dfrac{\\pi d_r^{2}}{4}',
      substituted: (v, _c, f) => `P_{cr} = \\dfrac{\\pi(${f('dr', v.dr!)})^{2}}{4}\\cdot\\dfrac{(${f('C', v.C!)})\\pi^{2}(${f('E', v.E!)})}{(${f('slender', v.slender!)})^{2}}`,
    },
    note: 'Columna larga (Euler).',
    origin: 'SHIGLEY', ref: 'Ec. 4-44',
  },
  {
    id: 'Pcr-johnson', target: 'Pcr', stage: 'buckling', inputs: ['slender', 'slender1', 'C', 'E', 'Sy', 'dr'],
    applies: c => c.load === 'compression',
    compute: v => (v.slender <= v.slender1
      ? ok(((Math.PI * v.dr ** 2) / 4) * (v.Sy - ((v.Sy / (2 * Math.PI)) * v.slender) ** 2 / (v.C * v.E)))
      : no('Columna larga: corresponde la fórmula de Euler.')),
    latex: {
      general: () => 'P_{cr} = A\\left[S_y - \\left(\\dfrac{S_y}{2\\pi}\\dfrac{L}{k}\\right)^{2}\\dfrac{1}{C E}\\right],\\quad A = \\dfrac{\\pi d_r^{2}}{4}',
      substituted: (v, _c, f) => `P_{cr} = \\dfrac{\\pi(${f('dr', v.dr!)})^{2}}{4}\\left[${f('Sy', v.Sy!)} - \\left(\\dfrac{${f('Sy', v.Sy!)}}{2\\pi}(${f('slender', v.slender!)})\\right)^{2}\\dfrac{1}{(${f('C', v.C!)})(${f('E', v.E!)})}\\right]`,
    },
    note: 'Columna intermedia (Johnson).',
    origin: 'SHIGLEY', ref: 'Ec. 8-9 = 4-46',
  },

  // ── Desgaste ──
  {
    id: 'ntEff-given', target: 'ntEff', stage: 'wear', inputs: ['nt'], hidden: true,
    compute: v => ok(v.nt),
    latex: { general: () => 'n_t', substituted: () => '' },
    origin: 'ESTATICA', ref: 'dato',
  },
  {
    id: 'ntEff-H', target: 'ntEff', stage: 'wear', inputs: ['H', 'p'],
    compute: v => (Math.floor(v.H / v.p + 1e-9) >= 1 ? ok(Math.floor(v.H / v.p + 1e-9)) : no('La tuerca es más corta que un paso.')),
    latex: {
      general: () => 'n_t = \\left\\lfloor \\dfrac{H}{p} \\right\\rfloor',
      substituted: (v, _c, f) => `n_t = \\left\\lfloor \\dfrac{${f('H', v.H!)}}{${f('p', v.p!)}} \\right\\rfloor`,
    },
    note: 'Filetes completos en contacto según la longitud de la tuerca.',
    origin: 'ESTATICA', ref: 'geometría',
  },
  {
    id: 'sBw', target: 'sBw', stage: 'wear', inputs: ['Fw', 'dm', 'p', 'ntEff'],
    compute: v => ok((2 * v.Fw) / (Math.PI * v.dm * v.ntEff * v.p)),
    latex: {
      general: () => '\\sigma_{B,t} = \\dfrac{2F}{\\pi d_m n_t\\, p}',
      substituted: (v, _c, f) => `\\sigma_{B,t} = \\dfrac{2(${f('Fw', v.Fw!)})}{\\pi(${f('dm', v.dm!)})(${f('ntEff', v.ntEff!)})(${f('p', v.p!)})}`,
    },
    note: 'Presión media sobre todos los filetes en contacto, con la carga completa.',
    origin: 'SHIGLEY', ref: 'Ec. 8-10 (magnitud) para comparar con Tabla 8-4',
  },
  {
    id: 'Vrub', target: 'Vrub', stage: 'wear', inputs: ['dm', 'N'],
    compute: v => ok((Math.PI * v.dm * v.N) / 60),
    latex: {
      general: () => 'V = \\dfrac{\\pi d_m N}{60}',
      substituted: (v, _c, f) => `V = \\dfrac{\\pi(${f('dm', v.dm!)})(${f('N', v.N!)})}{60}`,
    },
    note: 'Velocidad de frotamiento en el diámetro medio.',
    origin: 'ESTATICA', ref: 'cinemática',
  },
  {
    id: 'pbEff-given', target: 'pbEff', stage: 'wear', inputs: ['pb'], hidden: true,
    compute: v => ok(v.pb),
    latex: { general: () => 'p_b', substituted: () => '' },
    origin: 'ESTATICA', ref: 'dato',
  },
  {
    id: 'pbEff-table', target: 'pbEff', stage: 'wear', inputs: ['nutCode', 'Vrub'],
    compute: (v, c) => {
      const sel = selectPb(v.nutCode === 2 ? 'castIron' : 'bronze', v.Vrub / FTMIN, c.pbPolicy);
      return 'reason' in sel ? no(sel.reason) : ok(psiToMPa(sel.psi));
    },
    latex: {
      general: () => 'p_b\\ \\text{según material de la tuerca y velocidad}',
      substituted: (v, c, _f) => {
        const sel = selectPb(v.nutCode === 2 ? 'castIron' : 'bronze', v.Vrub! / FTMIN, c.pbPolicy);
        return 'reason' in sel ? '' : `p_b = ${Math.round(sel.psi)}\\ \\mathrm{psi}\\quad \\text{(${sel.how})}`;
      },
    },
    note: 'Valor conservador por defecto: extremo inferior del rango; si la velocidad cae entre filas, la fila de velocidad superior o una interpolación lineal declarada.',
    origin: 'SHIGLEY', ref: 'Tabla 8-4 + política del usuario (conservador / interpolación)',
  },

  {
    id: 'pbEff-manual', target: 'pbEff', stage: 'wear', inputs: ['nutCode'],
    applies: c => c.manualDrive,
    compute: v => ok(psiToMPa(manualPb(v.nutCode).psi)),
    latex: {
      general: () => 'p_b\ \text{para accionamiento manual}',
      substituted: v => `p_b = ${manualPb(v.nutCode!).psi}\ \mathrm{psi}\quad \text{(${manualPb(v.nutCode!).how})}`,
    },
    note: 'Tornillo girado a mano: se usa la fila de baja velocidad sin necesidad de conocer N. Si escribe N, se usa la fila que corresponde a esa velocidad.',
    origin: 'SHIGLEY', ref: 'Tabla 8-4, fila "baja velocidad" (prensa manual en la fuente original)',
  },

  // ── Cinemática ──
  {
    id: 'v', target: 'v', stage: 'kinematics', inputs: ['N', 'l'],
    compute: v => ok((v.N * v.l) / 60),
    latex: { general: () => 'v = \\dfrac{N\\,l}{60}', substituted: (v, _c, f) => `v = \\dfrac{(${f('N', v.N!)})(${f('l', v.l!)})}{60}` },
    note: 'Velocidad de avance de la tuerca o de la carga.',
    origin: 'ESTATICA', ref: 'cinemática',
  },
  {
    id: 'power', target: 'power', stage: 'kinematics', inputs: ['T', 'N'],
    compute: v => ok((v.T * (2 * Math.PI * v.N) / 60) / 1000),
    latex: {
      general: () => 'H = T\\,\\omega = T\\,\\dfrac{2\\pi N}{60}',
      substituted: (v, _c, f) => `H = (${f('T', v.T!)})\\dfrac{2\\pi(${f('N', v.N!)})}{60}\\cdot 10^{-3}`,
    },
    note: 'Potencia para subir la carga, medida en el tornillo.',
    origin: 'ESTATICA', ref: 'H = T ω',
  },
];

// ── Selección de p_b ─────────────────────────────────────────────────────────

/** Accionamiento manual. Bronce: fila "baja velocidad"; hierro fundido no tiene esa fila, se usa la más lenta. */
function manualPb(nutCode: number): { psi: number; how: string } {
  const nut = nutCode === 2 ? 'castIron' : 'bronze';
  const row = nut === 'bronze'
    ? BEARING_PRESSURE.find(r => r.nut === 'bronze' && r.vMin === 0 && r.vMax === 0)!
    : BEARING_PRESSURE.filter(r => r.nut === 'castIron').sort((a, b) => a.vMin - b.vMin)[0];
  return {
    psi: row.pbMinPsi,
    how: nut === 'bronze'
      ? 'accionamiento manual, fila de baja velocidad, extremo inferior'
      : 'accionamiento manual con tuerca de hierro fundido: fila más lenta, extremo inferior',
  };
}

type PbSel = { psi: number; how: string } | { reason: string };

/** Tornillo de acero. V en ft/min. Conservador: extremo inferior y fila superior en huecos. */
export function selectPb(nut: 'bronze' | 'castIron', V: number, policy: 'conservative' | 'interpolate'): PbSel {
  const rows = BEARING_PRESSURE
    .filter(r => r.nut === nut && !(r.vMin === 0 && r.vMax === 0)) // la fila "baja velocidad" se elige a mano
    .sort((a, b) => a.vMin - b.vMin);
  const inRow = rows.find(r => V >= r.vMin && (r.vMax === null || V <= r.vMax));
  if (inRow) return { psi: inRow.pbMinPsi, how: `fila ${inRow.label}, extremo inferior` };
  const above = rows.find(r => r.vMin > V);
  const below = [...rows].reverse().find(r => r.vMax !== null && r.vMax < V);
  if (!above) {
    return { reason: `La velocidad de frotamiento (${V.toFixed(1)} ft/min) está por encima de la tabla para tuerca de ${nut === 'bronze' ? 'bronce' : 'hierro fundido'}; escriba p_b a mano.` };
  }
  if (policy === 'interpolate' && below) {
    const t = (V - below.vMax!) / (above.vMin - below.vMax!);
    const psi = below.pbMinPsi + t * (above.pbMinPsi - below.pbMinPsi);
    return { psi, how: `interpolado linealmente entre ${below.label} y ${above.label}` };
  }
  return { psi: above.pbMinPsi, how: `fila ${above.label} (velocidad superior inmediata), extremo inferior` };
}
