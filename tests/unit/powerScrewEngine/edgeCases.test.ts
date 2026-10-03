/** Casos límite: datos faltantes, inválidos, imposibles, cambio de configuración y reinicio. */
import { describe, it, expect } from 'vitest';
import { ENGINE, DEFAULT_CONFIG, solve } from '@/features/powerScrew/engine';
import { initialState, reducer } from '@/features/powerScrew/state/problemState';
import { tableExtras } from '@/features/powerScrew/state/usePowerScrew';
import { EXAMPLE_LEVER } from '@/features/powerScrew/examples/examples';
import type { EnteredInputs } from '@/features/powerScrew/engine/types';

const mm = (value: number) => ({ value, unit: 'mm' });
const N = (value: number) => ({ value, unit: 'N' });
const one = (value: number) => ({ value, unit: '1' });
const cnt = (value: number) => ({ value, unit: 'count' });

describe('datos faltantes', () => {
  it('sin ningún dato no hay errores, todo está pendiente y hay una sugerencia', () => {
    const r = solve(ENGINE, DEFAULT_CONFIG, {});
    expect(r.issues).toEqual([]);
    expect(r.blocked).toEqual([]);
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.checks.every(c => c.status === 'pending' || c.status === 'na')).toBe(true);
  });

  it('cada pendiente nombra solo datos que el usuario puede escribir con la configuración actual', () => {
    for (const transmission of ['direct', 'lever', 'reducer'] as const) {
      const cfg = { ...DEFAULT_CONFIG, transmission, thrust: 'collar' as const };
      const r = solve(ENGINE, cfg, { d: mm(32) });
      const visible = new Set(['d', 'p', 'n', 'F', 'f', 'fc', 'dc', 'Sy', 'nTarget', 'E', 'Lcol', 'C', 'nt', 'H', 'pb', 'N',
        ...(transmission === 'direct' ? ['Tin'] : transmission === 'lever' ? ['P', 'r'] : ['Tm', 'i', 'etaG'])]);
      for (const p of r.pending) for (const m of p.missing) expect(visible.has(m)).toBe(true);
    }
  });
});

describe('datos inválidos', () => {
  it.each([
    ['F', N(0), /mayor que cero/],
    ['F', N(-100), /mayor que cero/],
    ['d', mm(-32), /mayor que cero/],
    ['f', one(1.5), /no puede ser mayor que 1/],
    ['n', cnt(0), /al menos 1/],
    ['nt', cnt(2.5), /entero/],
    ['etaG', one(0), /mayor que cero/],
  ] as const)('%s = %o se rechaza con explicación', (id, v, msg) => {
    const cfg = id === 'etaG' ? { ...DEFAULT_CONFIG, transmission: 'reducer' as const } : DEFAULT_CONFIG;
    const r = solve(ENGINE, cfg, { [id]: v } as EnteredInputs);
    const issue = r.issues.find(i => i.id === id);
    expect(issue?.severity).toBe('error');
    expect(issue?.message).toMatch(msg);
    expect(r.values[id]).toBeUndefined();
  });

  it('una fricción fuera del rango habitual se usa, pero con aviso', () => {
    const r = solve(ENGINE, DEFAULT_CONFIG, { f: one(0.4) });
    expect(r.issues.find(i => i.id === 'f')?.severity).toBe('warning');
    expect(r.values.f).toBe(0.4);
  });
});

describe('combinaciones imposibles', () => {
  // Avance enorme con fricción alta: π d_m − f l ≤ 0 → la rosca se traba.
  const jam: EnteredInputs = { d: mm(10), p: mm(4), n: cnt(60), F: N(1000), f: one(0.25) };

  it('la rosca trabada bloquea el par con una explicación accionable', () => {
    const r = solve(ENGINE, DEFAULT_CONFIG, jam);
    const b = r.blocked.find(x => x.target === 'TR');
    expect(b?.reason).toMatch(/Reduzca el avance o la fricción/);
    expect(r.checks.find(c => c.id === 'torqueEq')?.status).toBe('fail');
  });

  it('lo que depende del par queda bloqueado citando la causa, no como "falta"', () => {
    const r = solve(ENGINE, DEFAULT_CONFIG, jam);
    const t = r.blocked.find(x => x.target === 'T');
    expect(t?.reason).toMatch(/Par para subir/);
    expect(r.pending.find(p => p.target === 'T')).toBeUndefined();
  });

  it('en capacidad, una entrada con la rosca trabada no da carga máxima', () => {
    const r = solve(ENGINE, DEFAULT_CONFIG, { d: mm(10), p: mm(4), n: cnt(60), f: one(0.25), Tin: { value: 10, unit: 'Nm' } });
    expect(r.values.Fw).toBeUndefined();
    // Sigue pidiendo F (se puede dar a mano), pero explica por qué no salió del par de entrada.
    const p = r.pending.find(x => x.target === 'Fw');
    expect(p?.missing).toEqual(['F']);
    expect(p?.reason).toMatch(/Reduzca el avance o la fricción/);
  });
});

describe('cambio de configuración', () => {
  it('los datos de un mecanismo que se deja de usar no intervienen, y vuelven al regresar', () => {
    let s = EXAMPLE_LEVER.build('SI');
    const leverF = solve(ENGINE, s.cfg, s.entered, { extras: tableExtras(s) }).values.Fw;
    s = reducer(s, { type: 'config', patch: { transmission: 'direct' } });
    const r = solve(ENGINE, s.cfg, s.entered, { extras: tableExtras(s) });
    expect(r.values.P).toBeUndefined();
    expect(r.values.Fw).toBeUndefined();                       // sin carga ni par de entrada
    expect(r.pending.find(p => p.target === 'Fw')?.missing).toEqual(['F']);
    s = reducer(s, { type: 'config', patch: { transmission: 'lever' } });
    expect(solve(ENGINE, s.cfg, s.entered, { extras: tableExtras(s) }).values.Fw).toBeCloseTo(leverF!, 9);
  });

  it('en tensión el esfuerzo axial es positivo y no hay pandeo', () => {
    const r = solve(ENGINE, { ...DEFAULT_CONFIG, load: 'tension' },
      { d: mm(32), p: mm(4), n: cnt(1), F: N(6400), f: one(0.08), Lcol: mm(300) });
    expect(r.values.sigma!).toBeGreaterThan(0);
    expect(r.values.Pcr).toBeUndefined();
    expect(r.checks.find(c => c.id === 'buckling')?.status).toBe('na');
  });

  it('editar f a mano desvincula la tabla: el autobloqueo deja de usar el extremo bajo', () => {
    let s = EXAMPLE_LEVER.build('SI');
    expect(tableExtras(s).fMin).toBe(0.10);
    s = reducer(s, { type: 'value', id: 'f', value: 0.12 });
    expect(tableExtras(s).fMin).toBeUndefined();
  });
});

describe('reiniciar y cargar', () => {
  it('reiniciar deja el estado inicial y el cálculo vacío', () => {
    const s = reducer(EXAMPLE_LEVER.build('SI'), { type: 'reset', system: 'SI' });
    expect(s).toEqual(initialState('SI'));
    expect(Object.keys(solve(ENGINE, s.cfg, s.entered).values)).toEqual(['alpha']);
  });

  it('cargar un estado lo reemplaza por completo', () => {
    const target = EXAMPLE_LEVER.build('SI');
    expect(reducer(initialState('SI'), { type: 'load', state: target })).toBe(target);
  });
});
