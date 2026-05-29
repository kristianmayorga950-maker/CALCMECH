import { describe, it, expect } from 'vitest';
import { convertToSI, displayValue } from '@/utils/unitConverter';

describe('convertToSI', () => {
  it('N → N (factor 1)', () => {
    expect(convertToSI(100, 'N')).toBeCloseTo(100);
  });
  it('kN → N', () => {
    expect(convertToSI(1, 'kN')).toBeCloseTo(1000);
  });
  it('lbf → N', () => {
    expect(convertToSI(1, 'lbf')).toBeCloseTo(4.448, 1);
  });
  it('tonf → N', () => {
    expect(convertToSI(1, 'tonf')).toBeCloseTo(9806.65, 0);
  });
});

describe('displayValue', () => {
  it('SI force', () => {
    expect(displayValue(1000, 'force', 'SI')).toBe('1000.0 N');
  });
  it('imperial force', () => {
    const s = displayValue(4.44822, 'force', 'imperial');
    expect(s).toContain('lbf');
  });
  it('SI stress', () => {
    expect(displayValue(100, 'stress', 'SI')).toBe('100.00 MPa');
  });
  it('imperial stress contains psi', () => {
    expect(displayValue(1, 'stress', 'imperial')).toContain('psi');
  });
});
