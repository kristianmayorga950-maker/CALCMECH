/** Formato numérico para la traza: cifras significativas, punto decimal (como el texto guía). */

export function fmtNum(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const mag = Math.floor(Math.log10(Math.abs(x)));
  const decimals = Math.min(8, Math.max(0, sig - 1 - mag));
  let s = x.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

/** Número para insertar en LaTeX: los negativos van entre paréntesis en una sustitución. */
export function texNum(x: number, sig = 4): string {
  const s = fmtNum(x, sig);
  return x < 0 ? `(${s})` : s;
}
