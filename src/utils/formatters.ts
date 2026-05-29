export function fmt(value: number, decimals = 3): string {
  return value.toFixed(decimals);
}

export function fmtSF(sf: number): string {
  return sf > 99 ? '> 99' : sf.toFixed(2);
}

export function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function verdictLabel(v: 'valid' | 'marginal' | 'invalid'): string {
  return v === 'valid' ? '✅ VÁLIDO' : v === 'marginal' ? '⚠️ MARGINAL' : '❌ INSUFICIENTE';
}

export function verdictClass(v: 'valid' | 'marginal' | 'invalid'): string {
  return v === 'valid' ? 'verdict-valid' : v === 'marginal' ? 'verdict-marginal' : 'verdict-invalid';
}
