import { describe, it, expect } from 'vitest';
import { ENGINE, solve } from '@/features/powerScrew/engine';
import { interpretEfficiency, interpretTorque, interpretUtilization, NUT_INTERPRETATION } from '@/features/powerScrew/engine/interpret';
import { tableExtras } from '@/features/powerScrew/state/usePowerScrew';
import { EXAMPLE_COLLAR, EXAMPLE_LEVER } from '@/features/powerScrew/examples/examples';

const run = (ex: typeof EXAMPLE_COLLAR) => { const s = ex.build('SI'); return { s, r: solve(ENGINE, s.cfg, s.entered, { extras: tableExtras(s) }) }; };

describe('interpretación de los gráficos', () => {
  const a = run(EXAMPLE_COLLAR), b = run(EXAMPLE_LEVER);

  it('par: reparto del ejercicio de 32 × 4 (31 % útil; 39 % apoyo, 30 % rosca)', () => {
    const t = interpretTorque(a.r)!;
    expect(t).toMatch(/Solo el 31\.1 %/);
    expect(t).toMatch(/68\.9 %/);
    expect(t).toMatch(/39\.1 % en el apoyo y 29\.8 % en la rosca/);
    expect(t).toMatch(/mayor pérdida está en el apoyo/);
  });

  it('eficiencia: ejercicio no autobloqueante; gato autobloqueante', () => {
    expect(interpretEfficiency(a.r, a.s.cfg)).toMatch(/\(4\.85°\) supera la frontera de autobloqueo \(4\.57°\)/);
    expect(interpretEfficiency(a.r, a.s.cfg)).toMatch(/apoyo puede retener/);
    expect(interpretEfficiency(b.r, b.s.cfg)).toMatch(/por debajo de la frontera.*fricción más baja de la tabla/);
  });

  it('utilización: nombra el criterio que gobierna y el siguiente', () => {
    expect(interpretUtilization(b.r.checks, b.s.cfg)).toMatch(/Gobierna «Fluencia en la raíz del filete»: usa el 87\.6 %/);
    expect(interpretUtilization(a.r.checks, a.s.cfg)).toMatch(/Gobierna «Desgaste de la rosca»/);
  });

  it('sin datos no inventa nada', () => {
    const empty = solve(ENGINE, EXAMPLE_COLLAR.build('SI').cfg, {});
    expect(interpretTorque(empty)).toBeNull();
    expect(interpretEfficiency(empty, EXAMPLE_COLLAR.build('SI').cfg)).toBeNull();
    expect(interpretUtilization(empty.checks, EXAMPLE_COLLAR.build('SI').cfg)).toBeNull();
  });

  it('ningún texto lleva símbolos en formato de código', () => {
    for (const t of [interpretTorque(a.r), interpretEfficiency(a.r, a.s.cfg), interpretEfficiency(b.r, b.s.cfg),
      interpretUtilization(a.r.checks, a.s.cfg), NUT_INTERPRETATION]) expect(t).not.toMatch(/[_\\]/);
  });
});
