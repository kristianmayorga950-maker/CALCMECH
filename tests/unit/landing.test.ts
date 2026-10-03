import { describe, it, expect } from 'vitest';
import { assemblySvg } from '@/components/landing/assembly';
import { PARTS, partOfTab } from '@/components/landing/parts';

describe('portada — plano de conjunto', () => {
  const svg = assemblySvg(PARTS.map(p => p.name));

  it('cada calculadora es una pieza numerada, enfocable y con nombre', () => {
    for (const p of PARTS) {
      const g = new RegExp(`<g class="part" data-part="${p.no}" tabindex="0" role="button" aria-label="Pieza ${p.no}: ${p.name}[^"]*"`);
      expect(svg).toMatch(g);
    }
    expect(svg.match(/class="part"/g)).toHaveLength(PARTS.length);
  });

  it('los ids internos son únicos y con prefijo propio (no chocan con otros dibujos)', () => {
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => id.startsWith('lp-'))).toBe(true);
    for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref);
  });

  it('las piezas cubren las tres pestañas, en orden', () => {
    expect(PARTS.map(p => p.id)).toEqual(['power', 'tension', 'shear']);
    for (const p of PARTS) expect(partOfTab(p.id).no).toBe(p.no);
  });
});
