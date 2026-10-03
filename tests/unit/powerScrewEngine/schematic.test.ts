import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { drawSystem, type SchematicInput } from '@/features/powerScrew/ui/schematic/schematic';
import { schematicInput, projectSnapshot } from '@/features/powerScrew/ui/schematic/fromState';
import { EXAMPLES } from '@/features/powerScrew/examples/examples';
import { initialState, reducer } from '@/features/powerScrew/state/problemState';
import { arbConfig } from './generators';

const arbInput: fc.Arbitrary<SchematicInput> = fc.record({
  thread: fc.constantFrom('square' as const, 'acme' as const),
  input: fc.constantFrom('direct' as const, 'lever' as const, 'reducer' as const),
  thrust: fc.constantFrom('none' as const, 'collar' as const, 'bearing' as const),
  load: fc.constantFrom('compression' as const, 'tension' as const),
  hands: fc.constantFrom(1 as const, 2 as const),
  compact: fc.boolean(),
  dims: fc.record({
    d: fc.option(fc.double({ min: 5, max: 200, noNaN: true }), { nil: undefined }),
    p: fc.option(fc.double({ min: 1, max: 20, noNaN: true }), { nil: undefined }),
    dc: fc.option(fc.double({ min: 5, max: 400, noNaN: true }), { nil: undefined }),
    r: fc.option(fc.double({ min: 1, max: 5000, noNaN: true }), { nil: undefined }),
    F: fc.option(fc.double({ min: 1, max: 1e7, noNaN: true }), { nil: undefined }),
    P: fc.option(fc.double({ min: 1, max: 1e4, noNaN: true }), { nil: undefined }),
  }),
});

/** Texto visible del SVG (contenido de <text>, sin etiquetas internas). */
const visibleText = (svg: string) => [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map(m => m[1].replace(/<[^>]+>/g, '')).join(' ');
/** Ancho del rectángulo de la palanca (la barra redondeada de 10 de alto). */
const leverWidth = (svg: string) => Number(/<rect x="[^"]+" y="[^"]+" width="([^"]+)" height="10" rx="5"/.exec(svg)?.[1]);

describe('esquema del sistema', () => {
  it('cada configuración dibuja sus piezas', () => {
    const base = { thread: 'square', load: 'compression' } as const;
    expect(drawSystem({ ...base, input: 'lever', thrust: 'collar' })).toMatch(/collarín/);
    expect(leverWidth(drawSystem({ ...base, input: 'lever', thrust: 'none' }))).toBeGreaterThan(0);
    const motor = drawSystem({ ...base, input: 'reducer', thrust: 'bearing' });
    expect(motor).toMatch(/motor/);
    expect(motor).toMatch(/rodamiento axial/);
    expect(motor.match(/<circle /g)?.length ?? 0).toBeGreaterThan(4);   // bolas del rodamiento
    expect(drawSystem({ ...base, input: 'direct', thrust: 'none' })).toMatch(/<ellipse[^>]*ry="14"/); // volante
    expect(drawSystem({ ...base, input: 'direct', thrust: 'none' })).not.toMatch(/collarín|rodamiento axial/);
    expect(drawSystem({ ...base, load: 'tension', input: 'direct', thrust: 'none' })).toMatch(/tensión/);
  });

  it('nunca muestra guiones bajos crudos ni valores no numéricos', () => {
    fc.assert(fc.property(arbInput, inp => {
      const t = visibleText(drawSystem(inp));
      expect(t).not.toMatch(/_/);
      expect(t).not.toMatch(/NaN|undefined|Infinity/);
    }));
  });

  it('la miniatura no lleva cotas ni rótulos', () => {
    fc.assert(fc.property(arbInput, inp => {
      expect(visibleText(drawSystem({ ...inp, compact: true })).trim()).toBe('');
    }));
  });

  it('a mayor brazo r, barra de palanca más larga (o igual en los topes)', () => {
    fc.assert(fc.property(fc.double({ min: 1, max: 1e5, noNaN: true }), fc.double({ min: 1, max: 1e5, noNaN: true }), (a, b) => {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      const w = (r: number) => leverWidth(drawSystem({ thread: 'square', load: 'compression', input: 'lever', thrust: 'none', dims: { r } }));
      expect(w(hi)).toBeGreaterThanOrEqual(w(lo));
    }));
  });

  it('la cota lleva el valor cuando existe y queda punteada cuando falta', () => {
    const inp = { thread: 'square', load: 'compression', input: 'lever', thrust: 'collar' } as const;
    expect(visibleText(drawSystem({ ...inp, dims: { d: 32 } }))).toMatch(/d = 32 mm/);
    expect(drawSystem({ ...inp, dims: {} })).toMatch(/class="sx-dimx"/);
  });
});

describe('del estado al esquema', () => {
  it('traduce la configuración tal cual', () => {
    fc.assert(fc.property(arbConfig, cfg => {
      const i = schematicInput(cfg, {});
      expect([i.thread, i.input, i.thrust, i.load, i.hands]).toEqual([cfg.thread, cfg.transmission, cfg.thrust, cfg.load, cfg.leverHands]);
    }));
  });

  it('sin apoyo de empuje no acota d_c', () => {
    fc.assert(fc.property(arbConfig, cfg => {
      const i = schematicInput({ ...cfg, thrust: 'none' }, { dc: 40, d: 30 });
      expect(i.dims?.dc).toBeUndefined();
      expect(i.dims?.d).toBe(30);
    }));
  });

  it('la miniatura de un ejemplo refleja su configuración y su veredicto', () => {
    for (const ex of EXAMPLES) {
      const s = ex.build('SI');
      const snap = projectSnapshot(s);
      expect(snap.input.compact).toBe(true);
      expect(snap.input.input).toBe(s.cfg.transmission);
      expect(snap.input.thrust).toBe(s.cfg.thrust);
      expect(snap.status).not.toBe('incomplete');
      expect(snap.governing).toBeTruthy();
      expect(snap.d).toBeGreaterThan(0);
      expect(snap.F).toBeGreaterThan(0);
    }
  });

  it('un proyecto vacío se ve incompleto, sin F ni d', () => {
    const snap = projectSnapshot(initialState('SI'));
    expect(snap.status).toBe('incomplete');
    expect(snap.F).toBeUndefined();
    expect(snap.d).toBeUndefined();
    const lever = projectSnapshot(reducer(initialState('SI'), { type: 'config', patch: { transmission: 'lever' } }));
    expect(lever.input.input).toBe('lever');
  });
});
