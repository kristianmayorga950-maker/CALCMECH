import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ENGINE, DEFAULT_CONFIG, solve } from '@/features/powerScrew/engine';
import type { EngineDefinition } from '@/features/powerScrew/engine/solver';
import type { EnteredInputs, InputId, ProblemConfig, Rule } from '@/features/powerScrew/engine/types';
import { INPUTS } from '@/features/powerScrew/engine/vars';
import { UNITS, unitsFor } from '@/features/powerScrew/engine/units';
import { arbConfig } from './generators';

const cfg = DEFAULT_CONFIG;
const mm = (value: number) => ({ value, unit: 'mm' });
const n = (value: number) => ({ value, unit: 'count' });

describe('solver — cálculo progresivo', () => {
  it('con d y p calcula d_m, d_r y h; l y λ quedan pendientes y piden n', () => {
    const r = solve(ENGINE, cfg, { d: mm(32), p: mm(4) });
    expect(r.values.dm).toBe(30);
    expect(r.values.dr).toBe(28);
    expect(r.values.h).toBe(2);
    const pend = Object.fromEntries(r.pending.map(p => [p.target, p.missing]));
    expect(pend.l).toEqual(['n']);
    expect(pend.lambda).toEqual(['n']);
  });

  it('geometría del ejercicio de rosca cuadrada 32 × 4, dos entradas', () => {
    const r = solve(ENGINE, cfg, { d: mm(32), p: mm(4), n: n(2) });
    expect(r.values.l).toBe(8);
    expect((r.values.lambda! * 180) / Math.PI).toBeCloseTo(4.852, 3);
    expect(r.pending.filter(p => p.stage === 'geometry')).toEqual([]);
  });

  it('sin datos, sugiere primero el dato que más resultados desbloquea', () => {
    const r = solve(ENGINE, cfg, {});
    expect(r.suggestions[0].id).toBe('p'); // p interviene en d_m, d_r, h, l y λ
    expect(r.steps.map(s => s.target)).toEqual(['alpha']);
  });

  it('convierte unidades y deja la nota de conversión', () => {
    const r = solve(ENGINE, cfg, { d: { value: 1.25, unit: 'in' }, p: { value: 0.2, unit: 'in' } });
    expect(r.values.d).toBeCloseTo(31.75, 10);
    expect(r.conversions.map(c => c.id).sort()).toEqual(['d', 'p']);
    expect(r.values.dm).toBeCloseTo(31.75 - 2.54, 10);
  });

  it('p ≥ d: error en p con explicación, y lo que depende de p queda pendiente', () => {
    const r = solve(ENGINE, cfg, { d: mm(4), p: mm(4) });
    const issue = r.issues.find(i => i.id === 'p');
    expect(issue?.severity).toBe('error');
    expect(issue?.message).toMatch(/menor que el diámetro mayor/);
    expect(r.values.dr).toBeUndefined();
    expect(r.pending.find(p => p.target === 'dr')?.missing).toEqual(['p']);
  });

  it('rechaza un número de entradas no entero', () => {
    const r = solve(ENGINE, cfg, { d: mm(32), p: mm(4), n: n(1.5) });
    expect(r.issues.find(i => i.id === 'n')?.message).toMatch(/entero/);
    expect(r.values.l).toBeUndefined();
  });

  it('la rosca Acme fija α = 14.5°', () => {
    const r = solve(ENGINE, { ...cfg, thread: 'acme' }, {});
    expect((r.values.alpha! * 180) / Math.PI).toBeCloseTo(14.5, 12);
  });
});

describe('solver — alternativas y bloqueos', () => {
  const ok = (value: number) => ({ ok: true as const, value });
  const rule = (id: string, target: Rule['target'], inputs: Rule['inputs'], compute: Rule['compute']): Rule => ({
    id, target, stage: 'torque', inputs, compute,
    latex: { general: () => id, substituted: () => id }, origin: 'DERIVADA', ref: 'test',
  });

  it('si una alternativa falla por dominio, usa la siguiente', () => {
    const def: EngineDefinition = { checks: [], rules: [
      rule('a', 'TR', ['d'], () => ({ ok: false, reason: 'falla a' })),
      rule('b', 'TR', ['p'], v => ok(v.p * 2)),
    ] };
    const r = solve(def, cfg, { d: mm(10), p: mm(3) });
    expect(r.values.TR).toBe(6);
    expect(r.blocked).toEqual([]);
  });

  it('un resultado bloqueado explica la causa, y los que dependen de él citan el origen', () => {
    const def: EngineDefinition = { checks: [], rules: [
      rule('a', 'TR', ['d'], () => ({ ok: false, reason: 'denominador ≤ 0' })),
      rule('b', 'T', ['TR'], v => ok(v.TR)),
    ] };
    const r = solve(def, cfg, { d: mm(10) });
    const b = Object.fromEntries(r.blocked.map(x => [x.target, x.reason]));
    expect(b.TR).toBe('denominador ≤ 0');
    expect(b.T).toMatch(/Par para subir.*denominador ≤ 0/);
  });

  it('elige el camino con menos datos faltantes entre alternativas', () => {
    const def: EngineDefinition = { checks: [], rules: [
      rule('largo', 'Fw', ['Tin', 'f', 'd'], () => ok(1)),
      rule('corto', 'Fw', ['F'], v => ok(v.F)),
    ] };
    const r = solve(def, cfg, {});
    expect(r.pending.find(p => p.target === 'Fw')?.missing).toEqual(['F']);
  });

  it('un valor calculado nunca reemplaza a otro ya resuelto por una alternativa previa', () => {
    const def: EngineDefinition = { checks: [], rules: [
      rule('dada', 'Fw', ['F'], v => ok(v.F)),
      rule('despejada', 'Fw', ['Tin'], () => ok(999)),
    ] };
    const r = solve(def, cfg, { F: { value: 6400, unit: 'N' }, Tin: { value: 1, unit: 'Nm' } });
    expect(r.values.Fw).toBe(6400);
  });
});

/** Valor que puede mandar el canal de entrada: cualquier número, unidad de cualquier dimensión. */
const arbEntered: fc.Arbitrary<EnteredInputs> = fc.dictionary(
  fc.constantFrom(...INPUTS.map(i => i.id)),
  fc.record({
    value: fc.oneof(fc.double(), fc.integer({ min: -5, max: 50 }), fc.constantFrom(0, 1, 4, 32)),
    unit:  fc.constantFrom(...UNITS.map(u => u.id), 'furlong'),
  }),
) as fc.Arbitrary<EnteredInputs>;

describe('solver — propiedades', () => {
  it('es total: nunca lanza, y todo valor resuelto es finito', () => {
    fc.assert(fc.property(arbConfig, arbEntered, (c, e) => {
      const r = solve(ENGINE, c, e);
      for (const v of Object.values(r.values)) expect(Number.isFinite(v)).toBe(true);
    }), { examples: [
      [DEFAULT_CONFIG, { d: { value: NaN, unit: 'mm' } }],
      [DEFAULT_CONFIG, { p: { value: -1, unit: 'mm' } }],
      // Contraejemplo encontrado: finito al escribirlo, infinito al convertirlo a N·mm.
      [{ ...DEFAULT_CONFIG, transmission: 'reducer' }, { Tm: { value: 1.3259104122900347e305, unit: 'lbfft' } }],
    ] });
  });

  it('cada resultado está en un solo estado: calculado, pendiente o bloqueado', () => {
    fc.assert(fc.property(arbConfig, arbEntered, (c, e) => {
      const r = solve(ENGINE, c, e);
      const pend = new Set(r.pending.map(p => p.target));
      const blk = new Set(r.blocked.map(b => b.target));
      for (const t of pend) { expect(t in r.values).toBe(false); expect(blk.has(t)).toBe(false); }
      for (const t of blk) expect(t in r.values).toBe(false);
    }));
  });

  it('dar un dato más nunca hace que un resultado ya calculado desaparezca', () => {
    const valid = fc.record({
      d: fc.double({ min: 10, max: 60, noNaN: true }),
      p: fc.double({ min: 1, max: 9, noNaN: true }),
      n: fc.integer({ min: 1, max: 4 }),
    });
    fc.assert(fc.property(valid, fc.constantFrom<InputId>('d', 'p', 'n'), (v, drop) => {
      const full: EnteredInputs = { d: mm(v.d), p: mm(v.p), n: n(v.n) };
      const partial = { ...full }; delete partial[drop];
      const a = solve(ENGINE, cfg, partial), b = solve(ENGINE, cfg, full);
      for (const k of Object.keys(a.values)) expect(k in b.values).toBe(true);
    }));
  });
});

// La unidad elegida debe corresponder a la dimensión del dato
it('una unidad de otra dimensión es un error del campo, no una excepción', () => {
  const r = solve(ENGINE, cfg, { d: { value: 32, unit: unitsFor('force')[0].id } });
  expect(r.issues.find(i => i.id === 'd')?.message).toMatch(/unidad/);
});
