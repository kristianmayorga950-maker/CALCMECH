/**
 * Ejercicio de referencia: rosca cuadrada d = 32 mm, p = 4 mm, rosca doble,
 * f = f_c = 0.08, d_c = 40 mm, F = 6.4 kN (valores publicados del texto guía).
 * Tolerancia: el redondeo del libro (≈ 0.5 %).
 */
import { describe, it, expect } from 'vitest';
import { ENGINE, DEFAULT_CONFIG, solve } from '@/features/powerScrew/engine';
import type { ProblemConfig } from '@/features/powerScrew/engine/types';

const cfg: ProblemConfig = { ...DEFAULT_CONFIG, thread: 'square', thrust: 'collar', transmission: 'direct' };
const r = solve(ENGINE, cfg, {
  d:  { value: 32,   unit: 'mm' },
  p:  { value: 4,    unit: 'mm' },
  n:  { value: 2,    unit: 'count' },
  F:  { value: 6.4,  unit: 'kN' },
  f:  { value: 0.08, unit: '1' },
  fc: { value: 0.08, unit: '1' },
  dc: { value: 40,   unit: 'mm' },
});
const v = r.values;
const near = (got: number | undefined, want: number, rel = 0.005) => {
  expect(got).toBeDefined();
  expect(Math.abs(got! - want)).toBeLessThanOrEqual(Math.abs(want) * rel);
};

describe('ejercicio de rosca cuadrada 32 × 4, doble, con collarín', () => {
  it('a) geometría', () => {
    expect(v.h).toBe(2); expect(v.dm).toBe(30); expect(v.dr).toBe(28); expect(v.l).toBe(8);
  });
  it('b) pares para subir y bajar', () => {
    near(v.TR, 15.94e3);
    near(v.Tc, 10.24e3);
    near(v.T, 26.18e3);
    near(v.TL, -0.466e3, 0.01);
    near(v.Tlow, 9.77e3);
  });
  it('c) eficiencia global', () => near(v.e, 0.311));
  it('d) esfuerzos en el cuerpo (torsión con el par total)', () => {
    near(v.tau, 6.07);
    near(v.sigma, -10.39);
  });
  it('e) apoyo en el primer filete (0.38F, n_t = 1)', () => near(v.sB1, -12.9));
  it('f) flexión en la raíz', () => near(v.sb1, 41.5));
  it('g) von Mises en la raíz y esfuerzos principales', () => {
    near(v.vm, 48.7);
    near(v.s1, 41.5); near(v.s2, 2.79, 0.01); near(v.s3, -13.18);
  });
  it('h) cortante máximo en la raíz', () => near(v.tmax, 27.3));

  it('la rosca no es autobloqueante, pero el collarín retiene la carga', () => {
    const lock = r.checks.find(c => c.id === 'selfLock');
    const hold = r.checks.find(c => c.id === 'hold');
    expect(lock?.status).toBe('warn');
    expect(hold?.status).toBe('ok');
  });

  it('sin material, la fluencia queda pendiente pidiendo S_y y n_obj', () => {
    const y = r.checks.find(c => c.id === 'rootYield');
    expect(y?.status).toBe('pending');
    expect(y?.missing?.sort()).toEqual(['Sy', 'nTarget']);
  });

  it('solo con el par de la rosca en el cuerpo, τ baja a 16·T_R/(π d_r³)', () => {
    const r2 = solve(ENGINE, { ...cfg, bodyTorque: 'threadOnly' }, {
      d: { value: 32, unit: 'mm' }, p: { value: 4, unit: 'mm' }, n: { value: 2, unit: 'count' },
      F: { value: 6.4, unit: 'kN' }, f: { value: 0.08, unit: '1' }, fc: { value: 0.08, unit: '1' }, dc: { value: 40, unit: 'mm' },
    });
    near(r2.values.tau, (16 * 15.937e3) / (Math.PI * 28 ** 3));
  });

  it('ninguna ecuación de la traza muestra referencias bibliográficas', () => {
    for (const s of r.steps) expect(`${s.general} ${s.substituted} ${s.note ?? ''}`).not.toMatch(/Shigley|Ec\.|Tabla|§/);
  });
});
