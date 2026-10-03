import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ENGINE, DEFAULT_CONFIG, solve } from '@/features/powerScrew/engine';
import { selectPb } from '@/features/powerScrew/engine/rules/stress';
import type { EnteredInputs, ProblemConfig } from '@/features/powerScrew/engine/types';

const mm = (value: number) => ({ value, unit: 'mm' });
const N = (value: number) => ({ value, unit: 'N' });
const one = (value: number) => ({ value, unit: '1' });
const cnt = (value: number) => ({ value, unit: 'count' });
const Nmm = (value: number) => ({ value, unit: 'Nmm' });

/** Rosca de potencia realista, construida (no filtrada): d, p < d/3, n, f, carga. */
const arbScrew = fc.record({
  d: fc.double({ min: 10, max: 80, noNaN: true }),
  pRatio: fc.double({ min: 0.06, max: 0.25, noNaN: true }),
  n: fc.integer({ min: 1, max: 3 }),
  f: fc.double({ min: 0.04, max: 0.25, noNaN: true }),
  F: fc.double({ min: 100, max: 200_000, noNaN: true }),
  thread: fc.constantFrom<'square' | 'acme'>('square', 'acme'),
  collar: fc.option(fc.record({ fc: fc.double({ min: 0.01, max: 0.2, noNaN: true }), dcRatio: fc.double({ min: 1, max: 2, noNaN: true }) }), { nil: undefined }),
});
type Screw = typeof arbScrew extends fc.Arbitrary<infer T> ? T : never;

function setup(s: Screw, withF = true): { cfg: ProblemConfig; entered: EnteredInputs } {
  const cfg: ProblemConfig = { ...DEFAULT_CONFIG, thread: s.thread, thrust: s.collar ? 'collar' : 'none' };
  const entered: EnteredInputs = { d: mm(s.d), p: mm(s.d * s.pRatio), n: cnt(s.n), f: one(s.f) };
  if (withF) entered.F = N(s.F);
  if (s.collar) { entered.fc = one(s.collar.fc); entered.dc = mm(s.d * s.collar.dcRatio); }
  return { cfg, entered };
}

describe('motor — propiedades de ingeniería', () => {
  it('capacidad y análisis son inversos: la carga máxima con el par requerido es la carga original', () => {
    fc.assert(fc.property(arbScrew, s => {
      const { cfg, entered } = setup(s);
      const a = solve(ENGINE, cfg, entered);
      fc.pre(a.values.T !== undefined); // dominio físico válido
      const { entered: e2 } = setup(s, false);
      const b = solve(ENGINE, cfg, { ...e2, Tin: Nmm(a.values.T!) });
      expect(Math.abs(b.values.Fw! - s.F)).toBeLessThanOrEqual(s.F * 1e-9);
    }));
  });

  it('con fricción, el par para subir supera al par sin fricción y 0 < e < 1', () => {
    fc.assert(fc.property(arbScrew, s => {
      const v = solve(ENGINE, setup(s).cfg, setup(s).entered).values;
      fc.pre(v.TR !== undefined);
      expect(v.TR!).toBeGreaterThan(v.T0!);
      expect(v.e!).toBeGreaterThan(0);
      expect(v.e!).toBeLessThan(1);
    }));
  });

  it('autobloqueo de la rosca ⇔ par para bajar positivo', () => {
    fc.assert(fc.property(arbScrew, s => {
      const r = solve(ENGINE, setup(s).cfg, setup(s).entered);
      const lock = r.checks.find(c => c.id === 'selfLock')!;
      fc.pre(lock.status === 'ok' || lock.status === 'warn');
      expect(lock.status === 'ok').toBe(r.values.TL! > 0);
    }));
  });

  it('a igualdad de datos, la rosca Acme pide más par que la cuadrada', () => {
    fc.assert(fc.property(arbScrew, s => {
      const sq = solve(ENGINE, setup({ ...s, thread: 'square' }).cfg, setup({ ...s, thread: 'square' }).entered).values.TR;
      const ac = solve(ENGINE, setup({ ...s, thread: 'acme' }).cfg, setup({ ...s, thread: 'acme' }).entered).values.TR;
      fc.pre(sq !== undefined && ac !== undefined);
      expect(ac!).toBeGreaterThan(sq!);
    }));
  });

  it('el par es proporcional a la carga: el doble de carga pide el doble de par', () => {
    fc.assert(fc.property(arbScrew, s => {
      const t1 = solve(ENGINE, setup(s).cfg, setup(s).entered).values.T;
      const t2 = solve(ENGINE, setup({ ...s, F: 2 * s.F }).cfg, setup({ ...s, F: 2 * s.F }).entered).values.T;
      fc.pre(t1 !== undefined);
      expect(Math.abs(t2! - 2 * t1!)).toBeLessThanOrEqual(t1! * 1e-9);
    }));
  });

  it('la carga crítica es continua en la transición Euler–Johnson', () => {
    const base = { ...DEFAULT_CONFIG };
    const make = (L: number) => solve(ENGINE, base, {
      d: mm(32), p: mm(4), n: cnt(1), F: N(1000),
      Sy: { value: 290, unit: 'MPa' }, E: { value: 207, unit: 'GPa' }, C: one(1), Lcol: mm(L),
    }).values;
    const at = make(1);
    const L1 = at.slender1! * at.k!;
    const below = make(L1 * (1 - 1e-7)).Pcr!, above = make(L1 * (1 + 1e-7)).Pcr!;
    expect(Math.abs(below - above)).toBeLessThanOrEqual(below * 1e-5);
    // En la transición vale A·S_y/2.
    expect(below).toBeCloseTo((Math.PI * 28 ** 2 / 4) * 290 / 2, 0);
  });
});

describe('motor — casos de verificación', () => {
  it('Johnson en una columna intermedia (cálculo a mano)', () => {
    const v = solve(ENGINE, DEFAULT_CONFIG, {
      d: mm(32), p: mm(4), n: cnt(1), F: N(1000),
      Sy: { value: 290, unit: 'MPa' }, E: { value: 207, unit: 'GPa' }, C: one(1), Lcol: mm(600),
    }).values;
    // k = 7 mm, L/k = 85.71 < (L/k)1 = 118.7 → Johnson: P_cr ≈ 132.0 kN
    expect(v.slender).toBeCloseTo(85.714, 2);
    expect(v.slender1).toBeCloseTo(118.70, 1);
    expect(v.Pcr! / 1000).toBeCloseTo(132.0, 0);
  });

  it('palanca: con la carga y el brazo calcula la fuerza necesaria; con dos manos, la mitad', () => {
    const base: EnteredInputs = { d: mm(32), p: mm(4), n: cnt(1), F: N(6400), f: one(0.08), r: mm(300) };
    const one_ = solve(ENGINE, { ...DEFAULT_CONFIG, transmission: 'lever' }, base).values;
    const two = solve(ENGINE, { ...DEFAULT_CONFIG, transmission: 'lever', leverHands: 2 }, base).values;
    expect(one_.Preq!).toBeCloseTo(one_.T! / 300, 9);
    expect(two.Preq!).toBeCloseTo(one_.Preq! / 2, 9);
  });

  it('palanca: con P y r, sin carga, despeja la carga máxima y no repite P ni r', () => {
    const r = solve(ENGINE, { ...DEFAULT_CONFIG, transmission: 'lever' },
      { d: mm(32), p: mm(4), n: cnt(1), f: one(0.08), P: N(200), r: mm(300) });
    expect(r.values.Fw).toBeGreaterThan(0);
    expect(r.values.Preq).toBeUndefined();
    expect(r.values.rreq).toBeUndefined();
    expect(r.steps.find(s => s.target === 'Fw')?.note).toMatch(/Carga máxima/);
  });

  it('datos de más: carga y par de entrada → la carga dada manda y se verifica si alcanza', () => {
    const r = solve(ENGINE, DEFAULT_CONFIG,
      { d: mm(32), p: mm(4), n: cnt(2), F: N(6400), f: one(0.08), Tin: Nmm(10_000) });
    expect(r.values.Fw).toBe(6400);
    const c = r.checks.find(x => x.id === 'inputEnough')!;
    expect(c.status).toBe('fail'); // T_R ≈ 15.9 N·m > 10 N·m
  });

  it('reductor: par del motor necesario = T / (i η_g)', () => {
    const v = solve(ENGINE, { ...DEFAULT_CONFIG, transmission: 'reducer' },
      { d: mm(32), p: mm(4), n: cnt(1), F: N(6400), f: one(0.08), i: one(20), etaG: one(0.8) }).values;
    expect(v.Tmreq!).toBeCloseTo(v.T! / 16, 9);
  });

  it('el autobloqueo usa el extremo bajo de la fricción cuando viene de una tabla', () => {
    // f = 0.16 (máximo) bloquearía; con f_mín = 0.06 no.
    const r = solve(ENGINE, DEFAULT_CONFIG,
      { d: mm(32), p: mm(4), n: cnt(2), F: N(6400), f: one(0.16) }, { extras: { fMin: 0.06 } });
    const c = r.checks.find(x => x.id === 'selfLock')!;
    expect(c.status).toBe('warn');
    expect(c.outcome?.explanation).toMatch(/extremo bajo/);
  });

  it('el pandeo no aplica en tensión', () => {
    const r = solve(ENGINE, { ...DEFAULT_CONFIG, load: 'tension' }, { d: mm(32), p: mm(4) });
    expect(r.checks.find(c => c.id === 'buckling')?.status).toBe('na');
    expect(r.pending.some(p => p.stage === 'buckling')).toBe(false);
  });

  it('desgaste: con tuerca de bronce y velocidad, compara la presión media con p_b', () => {
    const r = solve(ENGINE, DEFAULT_CONFIG,
      { d: mm(32), p: mm(4), n: cnt(1), F: N(6400), nt: cnt(4), N: { value: 20, unit: 'rpm' } }, { extras: { nutCode: 1 } });
    // V = π·30·20/60 mm/s = 31.4 mm/s = 6.18 ft/min → fila ≤ 10 ft/min, 1600 psi
    expect(r.values.pbEff!).toBeCloseTo(1600 * 0.0068947572931684, 6);
    expect(r.checks.find(c => c.id === 'wear')?.status).toBe('ok');
  });
});

describe('presión de apoyo: selección en la tabla', () => {
  it.each([
    ['bronze', 5, 'conservative', 1600],
    ['bronze', 15, 'conservative', 800],
    ['bronze', 15, 'interpolate', 1200],
    ['bronze', 30, 'conservative', 800],
    ['bronze', 45, 'conservative', 150],
    ['bronze', 60, 'conservative', 150],
    ['castIron', 5, 'conservative', 1800],
    ['castIron', 10, 'conservative', 600],
    ['castIron', 10, 'interpolate', 1600],
  ] as const)('%s a %s ft/min (%s) → %s psi', (nut, V, pol, psi) => {
    const s = selectPb(nut, V, pol);
    expect('psi' in s && s.psi).toBeCloseTo(psi, 9);
  });

  it('por encima de la tabla para hierro fundido pide p_b a mano', () => {
    const s = selectPb('castIron', 45, 'conservative');
    expect('reason' in s && s.reason).toMatch(/escriba p_b/);
  });
});

describe('motor — resultados opcionales', () => {
  it('lo que solo depende de una tabla no elegida no aparece como pendiente ni bloqueado', () => {
    const r = solve(ENGINE, { ...DEFAULT_CONFIG, thrust: 'collar' },
      { d: mm(32), p: mm(4), n: cnt(2), F: N(6400), f: one(0.08), fc: one(0.08), dc: mm(40) });
    expect(r.pending.find(p => p.target === 'Tstart')).toBeUndefined();
    expect(r.blocked.find(b => b.target === 'Tstart')).toBeUndefined();
    const withTable = solve(ENGINE, { ...DEFAULT_CONFIG, thrust: 'collar' },
      { d: mm(32), p: mm(4), n: cnt(2), F: N(6400), f: one(0.08), fc: one(0.08), dc: mm(40) }, { extras: { fcStart: 0.1 } });
    expect(withTable.values.Tstart).toBeCloseTo(withTable.values.TR! + 6400 * 0.1 * 40 / 2, 6);
  });
});

describe('accionamiento manual', () => {
  const data: EnteredInputs = { d: mm(32), p: mm(4), n: cnt(1), F: N(6400), nt: cnt(4) };
  it('con tuerca de bronce y sin velocidad, usa la fila de baja velocidad (2500 psi)', () => {
    const r = solve(ENGINE, { ...DEFAULT_CONFIG, manualDrive: true }, data, { extras: { nutCode: 1 } });
    expect(r.values.pbEff!).toBeCloseTo(2500 * 0.0068947572931684, 6);
    expect(r.steps.find(s => s.target === 'pbEff')?.substituted).toMatch(/accionamiento manual/);
  });
  it('si se da la velocidad, manda la fila de esa velocidad', () => {
    const r = solve(ENGINE, { ...DEFAULT_CONFIG, manualDrive: true }, { ...data, N: { value: 20, unit: 'rpm' } }, { extras: { nutCode: 1 } });
    expect(r.values.pbEff!).toBeCloseTo(1600 * 0.0068947572931684, 6);
  });
  it('sin accionamiento manual y sin velocidad, p_b queda pendiente pidiendo N o p_b', () => {
    const r = solve(ENGINE, DEFAULT_CONFIG, data, { extras: { nutCode: 1 } });
    expect(r.values.pbEff).toBeUndefined();
    expect(r.pending.find(p => p.target === 'pbEff')?.missing.length).toBe(1);
  });
});
