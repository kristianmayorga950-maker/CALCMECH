import type { ProblemConfig, RuleOutcome } from '../types';

export const ok = (value: number): RuleOutcome => ({ ok: true, value });
export const no = (reason: string): RuleOutcome => ({ ok: false, reason });

export const sec = (a: number) => 1 / Math.cos(a);

/** Factor de fricción en LaTeX: '' para rosca cuadrada, '\sec\alpha' para Acme. */
export const secTex = (cfg: ProblemConfig) => (cfg.thread === 'acme' ? '\\sec\\alpha' : '');

/** `\sec(14.5^\circ)` sustituido, o '' para rosca cuadrada. */
export const secSub = (cfg: ProblemConfig) => (cfg.thread === 'acme' ? '\\sec 14.5^{\\circ}' : '');

export const hasThrust = (cfg: ProblemConfig) => cfg.thrust !== 'none';
export const noThrust = (cfg: ProblemConfig) => cfg.thrust === 'none';

/** Fracción del primer filete de la tuerca para el esfuerzo máximo. */
export const Q = 0.38;
