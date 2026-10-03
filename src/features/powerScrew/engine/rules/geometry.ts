/** Geometría de la rosca y carga de trabajo. */

import type { Rule } from '../types';

const ok = (value: number) => ({ ok: true as const, value });
const no = (reason: string) => ({ ok: false as const, reason });

export const geometryRules: Rule[] = [
  {
    id: 'alpha', target: 'alpha', stage: 'geometry', inputs: [],
    compute: (_v, cfg) => ok(cfg.thread === 'acme' ? (14.5 * Math.PI) / 180 : 0),
    latex: {
      general: cfg => cfg.thread === 'acme'
        ? '2\\alpha = 29^{\\circ} \\;\\Rightarrow\\; \\alpha = 14.5^{\\circ}'
        : '\\alpha = 0^{\\circ}',
      substituted: () => '',
    },
    note: 'Lo define el tipo de rosca.',
    origin: 'SHIGLEY', ref: 'Fig. 8-3',
  },
  {
    id: 'dm', target: 'dm', stage: 'geometry', inputs: ['d', 'p'],
    compute: v => (v.d - v.p / 2 > 0 ? ok(v.d - v.p / 2) : no('El paso es demasiado grande para este diámetro.')),
    latex: {
      general: () => 'd_m = d - \\dfrac{p}{2}',
      substituted: (v, _c, f) => `d_m = ${f('d', v.d!)} - \\dfrac{${f('p', v.p!)}}{2}`,
    },
    origin: 'SHIGLEY', ref: 'Ej. 8-1(a)',
  },
  {
    id: 'dr', target: 'dr', stage: 'geometry', inputs: ['d', 'p'],
    compute: v => (v.d - v.p > 0 ? ok(v.d - v.p) : no('El paso es igual o mayor que el diámetro mayor: el diámetro menor sería cero o negativo.')),
    latex: {
      general: () => 'd_r = d - p',
      substituted: (v, _c, f) => `d_r = ${f('d', v.d!)} - ${f('p', v.p!)}`,
    },
    origin: 'SHIGLEY', ref: 'Ej. 8-1(a)',
  },
  {
    id: 'h', target: 'h', stage: 'geometry', inputs: ['p'],
    compute: v => ok(v.p / 2),
    latex: {
      general: () => 'h = b = \\dfrac{p}{2}',
      substituted: (v, _c, f) => `h = b = \\dfrac{${f('p', v.p!)}}{2}`,
    },
    note: 'Profundidad y ancho del filete.',
    origin: 'SHIGLEY', ref: 'Fig. 8-3a; Ej. 8-1(a)',
  },
  {
    id: 'l', target: 'l', stage: 'geometry', inputs: ['n', 'p'],
    compute: v => ok(v.n * v.p),
    latex: {
      general: () => 'l = n\\,p',
      substituted: (v, _c, f) => `l = (${f('n', v.n!)})(${f('p', v.p!)})`,
    },
    origin: 'SHIGLEY', ref: '§8-1',
  },
  {
    id: 'lambda', target: 'lambda', stage: 'geometry', inputs: ['l', 'dm'],
    compute: v => ok(Math.atan(v.l / (Math.PI * v.dm))),
    latex: {
      general: () => '\\lambda = \\tan^{-1}\\!\\left(\\dfrac{l}{\\pi d_m}\\right)',
      substituted: (v, _c, f) => `\\lambda = \\tan^{-1}\\!\\left(\\dfrac{${f('l', v.l!)}}{\\pi(${f('dm', v.dm!)})}\\right)`,
    },
    origin: 'SHIGLEY', ref: '§8-2, Fig. 8-6',
  },
  {
    id: 'Fw-given', target: 'Fw', stage: 'load', inputs: ['F'],
    compute: v => ok(v.F),
    latex: { general: () => 'F', substituted: () => '' },
    hidden: true,
    origin: 'ESTATICA', ref: 'dato',
  },
];
