import { describe, it, expect } from 'vitest';
import { ENGINE, solve } from '@/features/powerScrew/engine';
import { verdict } from '@/features/powerScrew/engine/summary';
import { tableExtras } from '@/features/powerScrew/state/usePowerScrew';
import { EXAMPLE_COLLAR, EXAMPLE_LEVER } from '@/features/powerScrew/examples/examples';

const run = (ex: typeof EXAMPLE_COLLAR) => {
  const s = ex.build('SI');
  return { s, r: solve(ENGINE, s.cfg, s.entered, { extras: tableExtras(s) }) };
};

describe('Ejemplo 1 · tornillo con collarín', () => {
  const { s, r } = run(EXAMPLE_COLLAR);
  const v = r.values;

  it('carga sin errores de datos y con el material desde la tabla', () => {
    expect(r.issues.filter(i => i.severity === 'error')).toEqual([]);
    expect(s.entered.Sy?.source).toMatch(/1040/);
  });

  it('reproduce los valores publicados del ejercicio base', () => {
    expect(v.TR! / 1000).toBeCloseTo(15.94, 2);
    expect(v.T! / 1000).toBeCloseTo(26.18, 2);
    expect(v.e!).toBeCloseTo(0.311, 3);
    expect(v.vm!).toBeCloseTo(48.7, 1);
    expect(v.tmax!).toBeCloseTo(27.3, 1);
  });

  it('evalúa todas las verificaciones: ninguna queda pendiente', () => {
    expect(r.checks.filter(c => c.status === 'pending')).toEqual([]);
  });

  it('la tuerca de 32 mm tiene 8 filetes y la presión media queda bajo p_b', () => {
    expect(v.ntEff).toBe(8);
    expect(r.checks.find(c => c.id === 'wear')?.status).toBe('ok');
  });

  it('la rosca no es autobloqueante, pero el collarín retiene la carga; el diseño cumple con observaciones', () => {
    expect(r.checks.find(c => c.id === 'selfLock')?.status).toBe('warn');
    expect(r.checks.find(c => c.id === 'hold')?.status).toBe('ok');
    expect(verdict(r.checks, s.cfg).status).toBe('warn');
  });

  it('columna corta: se usa Johnson y el pandeo cumple', () => {
    expect(v.slender!).toBeLessThan(v.slender1!);
    expect(r.checks.find(c => c.id === 'buckling')?.status).toBe('ok');
  });
});

describe('Ejemplo 2 · gato con palanca', () => {
  const { s, r } = run(EXAMPLE_LEVER);
  const v = r.values;

  it('usa la palanca y los datos de tabla elegidos', () => {
    expect(s.cfg.transmission).toBe('lever');
    expect(s.cfg.thread).toBe('acme');
    expect(s.cfg.manualDrive).toBe(true);
    expect(s.entered.f?.value).toBe(0.16);
    expect(s.entered.fc?.value).toBe(0.08);
    expect(r.issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('sin carga dada, despeja la carga máxima a partir de P·r', () => {
    expect(s.entered.F).toBeUndefined();
    expect(v.Tavail).toBeCloseTo(250 * 400, 9);
    expect(v.T).toBeCloseTo(v.Tavail!, 6);
    expect(v.Fw!).toBeGreaterThan(0);
  });

  it('la ventaja mecánica es la carga entre la fuerza en la palanca', () => {
    expect(v.MA!).toBeCloseTo(v.Fw! / 250, 6);
  });

  it('con accionamiento manual, la presión admisible sale de la fila de baja velocidad', () => {
    expect(v.pbEff! / 0.0068947572931684).toBeCloseTo(2500, 6);
  });

  it('la rosca Acme lubricada se verifica con el extremo bajo de la fricción (0.10)', () => {
    const c = r.checks.find(x => x.id === 'selfLock')!;
    expect(c.outcome?.computed).toBeCloseTo(0.10 / Math.cos((14.5 * Math.PI) / 180), 9);
    expect(c.status).toBe('ok');
  });

  it('la columna empotrada–libre usa C = 1/4 y evalúa el pandeo', () => {
    expect(s.entered.C?.value).toBe(0.25);
    expect(r.checks.find(x => x.id === 'buckling')?.status).toMatch(/ok|fail/);
  });

  it('todas las verificaciones aplicables quedan evaluadas', () => {
    expect(r.checks.filter(c => c.status === 'pending')).toEqual([]);
  });
});

describe('planteamientos', () => {
  it('no muestran símbolos en formato de código (guiones bajos o barras invertidas)', () => {
    for (const ex of [EXAMPLE_COLLAR, EXAMPLE_LEVER]) expect(ex.statement).not.toMatch(/[_\\]/);
  });
});
