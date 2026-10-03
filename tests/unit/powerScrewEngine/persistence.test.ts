import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { serialize, parse, saveProject, listProjects, deleteProject, reportMarkdown, type KeyValueStore } from '@/features/powerScrew/state/persistence';
import { initialState, reducer, type Action, type ProblemState } from '@/features/powerScrew/state/problemState';
import { EXAMPLES } from '@/features/powerScrew/examples/examples';
import { ENGINE, solve } from '@/features/powerScrew/engine';
import { INPUTS } from '@/features/powerScrew/engine/vars';
import { unitsFor } from '@/features/powerScrew/engine/units';
import { ACME_SIZES, SCREW_MATERIALS } from '@/features/powerScrew/data/tables';

const memStore = (): KeyValueStore & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

/** Estados construidos con acciones reales de la interfaz (no objetos inventados). */
const arbAction: fc.Arbitrary<Action> = fc.oneof(
  fc.record({ type: fc.constant('value' as const), id: fc.constantFrom(...INPUTS.filter(i => i.visible({ ...initialState().cfg })).map(i => i.id)), value: fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }) }),
  fc.constantFrom(...INPUTS.map(i => i.id)).chain(id => fc.record({ type: fc.constant('unit' as const), id: fc.constant(id), unit: fc.constantFrom(...unitsFor(INPUTS.find(x => x.id === id)!.dim).map(u => u.id)) })),
  fc.record({ type: fc.constant('acme' as const), sizeId: fc.constantFrom(...ACME_SIZES.map(a => a.id)) }),
  fc.record({ type: fc.constant('material' as const), materialId: fc.constantFrom(...SCREW_MATERIALS.map(m => m.id)) }),
  fc.record({ type: fc.constant('config' as const), patch: fc.record({ transmission: fc.constantFrom('direct', 'lever', 'reducer'), thrust: fc.constantFrom('none', 'collar', 'bearing') }) }),
) as fc.Arbitrary<Action>;
const arbState = fc.array(arbAction, { maxLength: 25 }).map(as => as.reduce(reducer, initialState('SI')));

describe('proyectos — ida y vuelta', () => {
  it('cargar lo guardado devuelve el mismo estado', () => {
    fc.assert(fc.property(arbState, fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), (s, name) => {
      const r = parse(serialize(s, name));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.state).toEqual(s);
    }));
  });

  it('los ejemplos se guardan y se recuperan idénticos', () => {
    for (const ex of EXAMPLES) {
      const s = ex.build('SI');
      const r = parse(serialize(s, ex.title));
      expect(r.ok && r.state).toEqual(s);
    }
  });
});

describe('proyectos — lectura segura', () => {
  it('nunca lanza con texto arbitrario', () => {
    fc.assert(fc.property(fc.string(), t => { expect(() => parse(t)).not.toThrow(); }));
    fc.assert(fc.property(fc.json(), t => { expect(() => parse(t)).not.toThrow(); }));
  });

  it('rechaza un JSON que no es un proyecto, con un mensaje claro', () => {
    const r = parse('{"a":1}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no es un proyecto/);
  });

  it('descarta datos inválidos, avisa cuáles, y conserva el resto', () => {
    const good = serialize(EXAMPLES[0].build('SI'), 'x');
    const obj = JSON.parse(good);
    obj.state.entered.d = { value: 'treinta', unit: 'mm' };
    obj.state.entered.F = { value: 6.4, unit: 'mm' };      // unidad de otra dimensión
    obj.state.entered.zz = { value: 1, unit: 'mm' };       // dato desconocido
    obj.state.cfg.thread = 'trapezoidal';                   // valor no permitido → por defecto
    const r = parse(JSON.stringify(obj));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.entered.d).toBeUndefined();
      expect(r.state.entered.F).toBeUndefined();
      expect(r.state.entered.p).toBeDefined();
      expect(r.state.cfg.thread).toBe('square');
      expect(r.name).toMatch(/se omitieron datos inválidos: d, F, zz/);
    }
  });

  it('rechaza un proyecto de una versión más nueva', () => {
    const obj = JSON.parse(serialize(initialState(), 'x')); obj.version = 99;
    expect(parse(JSON.stringify(obj)).ok).toBe(false);
  });
});

describe('biblioteca local', () => {
  it('guardar, listar (más reciente primero), sobrescribir, duplicar y borrar', () => {
    const st = memStore();
    const a = saveProject(st, 'A', EXAMPLES[0].build('SI'), undefined, new Date('2026-10-01T10:00:00Z'))!;
    const b = saveProject(st, 'B', EXAMPLES[1].build('SI'), undefined, new Date('2026-10-01T11:00:00Z'))!;
    expect(listProjects(st).map(p => p.name)).toEqual(['B', 'A']);
    saveProject(st, 'A editado', EXAMPLES[0].build('SI'), a, new Date('2026-10-01T12:00:00Z'));
    expect(listProjects(st).map(p => p.name)).toEqual(['A editado', 'B']);
    const copy = saveProject(st, 'B (copia)', listProjects(st).find(p => p.id === b)!.state, undefined, new Date('2026-10-01T13:00:00Z'));
    expect(copy).not.toBe(b);
    expect(listProjects(st)).toHaveLength(3);
    deleteProject(st, a);
    expect(listProjects(st).map(p => p.name)).toEqual(['B (copia)', 'B']);
  });

  it('sin almacenamiento disponible no falla y lo informa', () => {
    expect(saveProject(null, 'x', initialState())).toBeNull();
    expect(listProjects(null)).toEqual([]);
    const broken: KeyValueStore = { getItem: () => '{roto', setItem: () => { throw new Error('lleno'); } };
    expect(listProjects(broken)).toEqual([]);
    expect(saveProject(broken, 'x', initialState())).toBeNull();
  });
});

describe('informe', () => {
  it('incluye datos, resultados y verificaciones, sin referencias bibliográficas', () => {
    const s: ProblemState = EXAMPLES[0].build('SI');
    const md = reportMarkdown('Ejemplo 1', s, solve(ENGINE, s.cfg, s.entered), 'SI');
    expect(md).toMatch(/## Datos/);
    expect(md).toMatch(/Par total para subir \| 26\.18 \| N·m/);
    expect(md).toMatch(/Fluencia en la raíz del filete \| cumple/);
    expect(md).not.toMatch(/Shigley|Tabla \d|Ec\.|§/);
  });
});
