/** Pares, eficiencia y transmisión. */

import type { ProblemConfig, Rule } from '../types';
import { hasThrust, no, noThrust, ok, sec, secSub, secTex } from './util';

const BAD_DEN =
  'Con esta fricción y este avance el par para subir no tiene sentido físico: el término π d_m − f l sec α es cero o negativo. Reduzca el avance o la fricción.';

/** Denominador de subida y factor de par por unidad de carga. */
function raiseFactor(dm: number, l: number, f: number, alpha: number): number | null {
  const s = sec(alpha);
  const den = Math.PI * dm - f * l * s;
  if (den <= 0) return null;
  return (dm / 2) * (l + Math.PI * f * dm * s) / den;
}

const trGeneral = (c: ProblemConfig) =>
  `T_R = \\dfrac{F\\,d_m}{2}\\cdot\\dfrac{l + \\pi f d_m ${secTex(c)}}{\\pi d_m - f\\,l ${secTex(c)}}`;
const tlGeneral = (c: ProblemConfig) =>
  `T_L = \\dfrac{F\\,d_m}{2}\\cdot\\dfrac{\\pi f d_m ${secTex(c)} - l}{\\pi d_m + f\\,l ${secTex(c)}}`;

export const torqueRules: Rule[] = [
  // ── Pares de la rosca ──
  {
    id: 'TR', target: 'TR', stage: 'torque', inputs: ['Fw', 'dm', 'l', 'f', 'alpha'],
    compute: v => {
      const k = raiseFactor(v.dm, v.l, v.f, v.alpha);
      return k === null ? no(BAD_DEN) : ok(v.Fw * k);
    },
    latex: {
      general: trGeneral,
      substituted: (v, c, f) =>
        `T_R = \\dfrac{(${f('Fw', v.Fw!)})(${f('dm', v.dm!)})}{2}\\cdot\\dfrac{${f('l', v.l!)} + \\pi(${f('f', v.f!)})(${f('dm', v.dm!)})${secSub(c)}}{\\pi(${f('dm', v.dm!)}) - (${f('f', v.f!)})(${f('l', v.l!)})${secSub(c)}}`,
    },
    note: 'Par para vencer la fricción de la rosca y subir la carga.',
    origin: 'SHIGLEY', ref: 'Ec. 8-1 (cuadrada), 8-5 (con ángulo)',
  },
  {
    id: 'TL', target: 'TL', stage: 'torque', inputs: ['Fw', 'dm', 'l', 'f', 'alpha'],
    compute: v => {
      const s = sec(v.alpha);
      return ok((v.Fw * v.dm / 2) * (Math.PI * v.f * v.dm * s - v.l) / (Math.PI * v.dm + v.f * v.l * s));
    },
    latex: {
      general: tlGeneral,
      substituted: (v, c, f) =>
        `T_L = \\dfrac{(${f('Fw', v.Fw!)})(${f('dm', v.dm!)})}{2}\\cdot\\dfrac{\\pi(${f('f', v.f!)})(${f('dm', v.dm!)})${secSub(c)} - ${f('l', v.l!)}}{\\pi(${f('dm', v.dm!)}) + (${f('f', v.f!)})(${f('l', v.l!)})${secSub(c)}}`,
    },
    note: 'Si sale negativo, la carga baja sola por la rosca.',
    origin: 'SHIGLEY', ref: 'Ec. 8-2; con ángulo: DERIVADA (fricción ÷ cos α, misma regla de 8-5)',
  },
  {
    id: 'T0', target: 'T0', stage: 'torque', inputs: ['Fw', 'l'],
    compute: v => ok((v.Fw * v.l) / (2 * Math.PI)),
    latex: {
      general: () => 'T_0 = \\dfrac{F\\,l}{2\\pi}',
      substituted: (v, _c, f) => `T_0 = \\dfrac{(${f('Fw', v.Fw!)})(${f('l', v.l!)})}{2\\pi}`,
    },
    note: 'Par que haría falta sin fricción.',
    origin: 'SHIGLEY', ref: 'Ec. (g) §8-2',
  },
  {
    id: 'Tc', target: 'Tc', stage: 'torque', inputs: ['Fw', 'fc', 'dc'], applies: hasThrust,
    compute: v => ok((v.Fw * v.fc * v.dc) / 2),
    latex: {
      general: () => 'T_c = \\dfrac{F\\,f_c\\,d_c}{2}',
      substituted: (v, _c, f) => `T_c = \\dfrac{(${f('Fw', v.Fw!)})(${f('fc', v.fc!)})(${f('dc', v.dc!)})}{2}`,
    },
    note: 'Se supone la carga concentrada en el diámetro medio del apoyo.',
    origin: 'SHIGLEY', ref: 'Ec. 8-6',
  },
  {
    id: 'T-thrust', target: 'T', stage: 'torque', inputs: ['TR', 'Tc'], applies: hasThrust,
    compute: v => ok(v.TR + v.Tc),
    latex: {
      general: () => 'T = T_R + T_c',
      substituted: (v, _c, f) => `T = ${f('TR', v.TR!)} + ${f('Tc', v.Tc!)}`,
    },
    origin: 'SHIGLEY', ref: 'Ej. 8-1(b)',
  },
  {
    id: 'T-none', target: 'T', stage: 'torque', inputs: ['TR'], applies: noThrust,
    compute: v => ok(v.TR),
    latex: { general: () => 'T = T_R', substituted: (v, _c, f) => `T = ${f('TR', v.TR!)}` },
    note: 'Sin apoyo de empuje, todo el par lo toma la rosca.',
    origin: 'SHIGLEY', ref: 'Ec. 8-1',
  },
  {
    id: 'Tlow-thrust', target: 'Tlow', stage: 'torque', inputs: ['TL', 'Tc'], applies: hasThrust,
    compute: v => ok(v.TL + v.Tc),
    latex: {
      general: () => 'T_{baj} = T_L + T_c',
      substituted: (v, _c, f) => `T_{baj} = ${f('TL', v.TL!)} + ${f('Tc', v.Tc!)}`,
    },
    note: 'Par para bajar la carga venciendo también el apoyo.',
    origin: 'SHIGLEY', ref: 'Ej. 8-1(b)',
  },
  {
    id: 'Tstart', target: 'Tstart', stage: 'torque', inputs: ['TR', 'Fw', 'fcStart', 'dc'],
    applies: c => c.thrust === 'collar',
    compute: v => ok(v.TR + (v.Fw * v.fcStart * v.dc) / 2),
    latex: {
      general: () => 'T_{arr} = T_R + \\dfrac{F\\,f_{c,arr}\\,d_c}{2}',
      substituted: (v, _c, f) => `T_{arr} = ${f('TR', v.TR!)} + \\dfrac{(${f('Fw', v.Fw!)})(${f('fcStart', v.fcStart!)})(${f('dc', v.dc!)})}{2}`,
    },
    note: 'Con la fricción de arranque del collarín, que es mayor que la de operación.',
    origin: 'DERIVADA', ref: 'Ec. 8-6 con f_c de arranque, Tabla 8-6',
  },

  // ── Eficiencia ──
  {
    id: 'e1', target: 'e1', stage: 'efficiency', inputs: ['T0', 'TR'],
    compute: v => (v.TR > 0 ? ok(v.T0 / v.TR) : no('El par para subir no es positivo.')),
    latex: {
      general: () => 'e_{rosca} = \\dfrac{T_0}{T_R} = \\dfrac{F\\,l}{2\\pi T_R}',
      substituted: (v, _c, f) => `e_{rosca} = \\dfrac{${f('T0', v.T0!)}}{${f('TR', v.TR!)}}`,
    },
    origin: 'SHIGLEY', ref: 'Ec. 8-4',
  },
  {
    id: 'e', target: 'e', stage: 'efficiency', inputs: ['T0', 'T'],
    compute: v => (v.T > 0 ? ok(v.T0 / v.T) : no('El par total no es positivo.')),
    latex: {
      general: () => 'e = \\dfrac{F\\,l}{2\\pi T}',
      substituted: (v, _c, f) => `e = \\dfrac{${f('T0', v.T0!)}}{${f('T', v.T!)}}`,
    },
    note: 'Eficiencia global, incluyendo el apoyo.',
    origin: 'SHIGLEY', ref: 'Ej. 8-1(c)',
  },
];

// ── Transmisión: par que la entrada entrega al tornillo, y despejes ──

export const transmissionRules: Rule[] = [
  {
    id: 'Tavail-direct', target: 'Tavail', stage: 'transmission', inputs: ['Tin'],
    applies: c => c.transmission === 'direct', hidden: true,
    compute: v => ok(v.Tin),
    latex: { general: () => 'T_{ent} = T_{in}', substituted: () => '' },
    origin: 'ESTATICA', ref: 'dato',
  },
  {
    id: 'Tavail-lever', target: 'Tavail', stage: 'transmission', inputs: ['P', 'r'],
    applies: c => c.transmission === 'lever',
    compute: (v, c) => ok(c.leverHands * v.P * v.r),
    latex: {
      general: c => (c.leverHands === 2 ? 'T_{ent} = 2P\\,r' : 'T_{ent} = P\\,r'),
      substituted: (v, c, f) => `T_{ent} = ${c.leverHands === 2 ? '2' : ''}(${f('P', v.P!)})(${f('r', v.r!)})`,
    },
    note: 'Par que produce la fuerza en la palanca.',
    origin: 'ESTATICA', ref: 'momento de una fuerza',
  },
  {
    id: 'Tavail-reducer', target: 'Tavail', stage: 'transmission', inputs: ['Tm', 'i', 'etaG'],
    applies: c => c.transmission === 'reducer',
    compute: v => ok(v.Tm * v.i * v.etaG),
    latex: {
      general: () => 'T_{ent} = T_m\\, i\\, \\eta_g',
      substituted: (v, _c, f) => `T_{ent} = (${f('Tm', v.Tm!)})(${f('i', v.i!)})(${f('etaG', v.etaG!)})`,
    },
    note: 'La eficiencia de la etapa es un dato del reductor.',
    origin: 'ESTATICA', ref: 'reductor ideal × eficiencia',
  },
  // Carga máxima que admite lo aplicado (el par es lineal en F).
  {
    id: 'Fw-capacity-thrust', target: 'Fw', stage: 'load', inputs: ['Tavail', 'dm', 'l', 'f', 'alpha', 'fc', 'dc'],
    applies: hasThrust,
    compute: v => {
      const k = raiseFactor(v.dm, v.l, v.f, v.alpha);
      return k === null ? no(BAD_DEN) : ok(v.Tavail / (k + (v.fc * v.dc) / 2));
    },
    latex: {
      general: c => `F = \\dfrac{T_{ent}}{\\dfrac{d_m}{2}\\cdot\\dfrac{l + \\pi f d_m ${secTex(c)}}{\\pi d_m - f\\,l ${secTex(c)}} + \\dfrac{f_c\\,d_c}{2}}`,
      substituted: (v, c, f) =>
        `F = \\dfrac{${f('Tavail', v.Tavail!)}}{\\dfrac{${f('dm', v.dm!)}}{2}\\cdot\\dfrac{${f('l', v.l!)} + \\pi(${f('f', v.f!)})(${f('dm', v.dm!)})${secSub(c)}}{\\pi(${f('dm', v.dm!)}) - (${f('f', v.f!)})(${f('l', v.l!)})${secSub(c)}} + \\dfrac{(${f('fc', v.fc!)})(${f('dc', v.dc!)})}{2}}`,
    },
    note: 'Carga máxima que se puede subir con lo aplicado en la entrada.',
    origin: 'DERIVADA', ref: 'despeje de Ec. 8-1/8-5 + 8-6',
  },
  {
    id: 'Fw-capacity', target: 'Fw', stage: 'load', inputs: ['Tavail', 'dm', 'l', 'f', 'alpha'],
    applies: noThrust,
    compute: v => {
      const k = raiseFactor(v.dm, v.l, v.f, v.alpha);
      return k === null ? no(BAD_DEN) : ok(v.Tavail / k);
    },
    latex: {
      general: c => `F = \\dfrac{2\\,T_{ent}}{d_m}\\cdot\\dfrac{\\pi d_m - f\\,l ${secTex(c)}}{l + \\pi f d_m ${secTex(c)}}`,
      substituted: (v, c, f) =>
        `F = \\dfrac{2(${f('Tavail', v.Tavail!)})}{${f('dm', v.dm!)}}\\cdot\\dfrac{\\pi(${f('dm', v.dm!)}) - (${f('f', v.f!)})(${f('l', v.l!)})${secSub(c)}}{${f('l', v.l!)} + \\pi(${f('f', v.f!)})(${f('dm', v.dm!)})${secSub(c)}}`,
    },
    note: 'Carga máxima que se puede subir con lo aplicado en la entrada.',
    origin: 'DERIVADA', ref: 'despeje de Ec. 8-1/8-5',
  },
  // Lo que hace falta en la entrada para el par requerido.
  {
    id: 'Tinreq', target: 'Tinreq', stage: 'transmission', inputs: ['T'], skipIfGiven: 'Tin',
    applies: c => c.transmission === 'direct',
    compute: v => ok(v.T),
    latex: { general: () => 'T_{in} = T', substituted: (v, _c, f) => `T_{in} = ${f('T', v.T!)}` },
    note: 'Par que hay que aplicar en la entrada.',
    origin: 'ESTATICA', ref: 'equilibrio',
  },
  {
    id: 'Preq', target: 'Preq', stage: 'transmission', inputs: ['T', 'r'], skipIfGiven: 'P',
    applies: c => c.transmission === 'lever',
    compute: (v, c) => ok(v.T / (c.leverHands * v.r)),
    latex: {
      general: c => (c.leverHands === 2 ? 'P = \\dfrac{T}{2r}' : 'P = \\dfrac{T}{r}'),
      substituted: (v, c, f) => `P = \\dfrac{${f('T', v.T!)}}{${c.leverHands === 2 ? '2' : ''}(${f('r', v.r!)})}`,
    },
    note: 'Fuerza necesaria en la palanca.',
    origin: 'ESTATICA', ref: 'momento',
  },
  {
    id: 'rreq', target: 'rreq', stage: 'transmission', inputs: ['T', 'P'], skipIfGiven: 'r',
    applies: c => c.transmission === 'lever',
    compute: (v, c) => ok(v.T / (c.leverHands * v.P)),
    latex: {
      general: c => (c.leverHands === 2 ? 'r = \\dfrac{T}{2P}' : 'r = \\dfrac{T}{P}'),
      substituted: (v, c, f) => `r = \\dfrac{${f('T', v.T!)}}{${c.leverHands === 2 ? '2' : ''}(${f('P', v.P!)})}`,
    },
    note: 'Brazo necesario para la fuerza disponible.',
    origin: 'ESTATICA', ref: 'momento',
  },
  {
    id: 'MA', target: 'MA', stage: 'transmission', inputs: ['e', 'r', 'l'],
    applies: c => c.transmission === 'lever',
    compute: (v, c) => ok((2 * Math.PI * c.leverHands * v.r * v.e) / v.l),
    latex: {
      general: c => (c.leverHands === 2 ? 'VM = \\dfrac{F}{P} = \\dfrac{2\\pi (2r)\\, e}{l}' : 'VM = \\dfrac{F}{P} = \\dfrac{2\\pi r\\, e}{l}'),
      substituted: (v, c, f) => `VM = \\dfrac{2\\pi ${c.leverHands === 2 ? '(2)' : ''}(${f('r', v.r!)})(${f('e', v.e!)})}{${f('l', v.l!)}}`,
    },
    note: 'Cuántas veces la carga supera a la fuerza en la palanca.',
    origin: 'DERIVADA', ref: 'T = P r con e = F l / (2π T)',
  },
  {
    id: 'Tmreq', target: 'Tmreq', stage: 'transmission', inputs: ['T', 'i', 'etaG'], skipIfGiven: 'Tm',
    applies: c => c.transmission === 'reducer',
    compute: v => ok(v.T / (v.i * v.etaG)),
    latex: {
      general: () => 'T_m = \\dfrac{T}{i\\,\\eta_g}',
      substituted: (v, _c, f) => `T_m = \\dfrac{${f('T', v.T!)}}{(${f('i', v.i!)})(${f('etaG', v.etaG!)})}`,
    },
    note: 'Par que debe dar el motor.',
    origin: 'ESTATICA', ref: 'reductor',
  },
];
