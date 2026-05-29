export const vonMises = (sigma: number, tau: number): number =>
  Math.sqrt(sigma ** 2 + 3 * tau ** 2);

export const johnsonCritical = (Sy: number, E: number, lambda: number, Ar: number): number =>
  Ar * Sy * (1 - (Sy * lambda ** 2) / (4 * Math.PI ** 2 * E));

export const eulerCritical = (E: number, lambda: number, Ar: number): number =>
  (Math.PI ** 2 * E * Ar) / lambda ** 2;

export const radToDeg = (r: number): number => r * (180 / Math.PI);
export const degToRad = (d: number): number => d * (Math.PI / 180);

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);
