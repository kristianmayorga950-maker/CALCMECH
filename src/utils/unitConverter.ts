export function convertToSI(
  value: number,
  fromUnit: 'N' | 'kN' | 'lbf' | 'tonf'
): number {
  const factors: Record<string, number> = { N: 1, kN: 1000, lbf: 4.44822, tonf: 9806.65 };
  return value * factors[fromUnit];
}

export function displayValue(
  valueSI: number,
  quantity: 'force' | 'torque' | 'stress' | 'length',
  system: 'SI' | 'imperial'
): string {
  if (system === 'imperial') {
    switch (quantity) {
      case 'force':  return `${(valueSI / 4.44822).toFixed(2)} lbf`;
      case 'torque': return `${(valueSI * 8.8507 / 1000).toFixed(2)} lbf·in`;
      case 'stress': return `${(valueSI * 0.14504).toFixed(1)} psi`;
      case 'length': return `${(valueSI / 25.4).toFixed(4)} in`;
    }
  }
  const units: Record<string, string> = {
    force: 'N', torque: 'N·m', stress: 'MPa', length: 'mm',
  };
  const decimals: Record<string, number> = {
    force: 1, torque: 3, stress: 2, length: 3,
  };
  return `${valueSI.toFixed(decimals[quantity])} ${units[quantity]}`;
}

export function mmToDisplay(mm: number, system: 'SI' | 'imperial'): string {
  return system === 'imperial'
    ? `${(mm / 25.4).toFixed(4)} in`
    : `${mm.toFixed(3)} mm`;
}

export function NmmToDisplay(Nmm: number, system: 'SI' | 'imperial'): string {
  // Convert N·mm → N·m for SI display
  return system === 'imperial'
    ? `${(Nmm * 0.008851).toFixed(2)} lbf·in`
    : `${(Nmm / 1000).toFixed(4)} N·m`;
}

/**
 * Converts a calculation result value based on its unit string.
 * Used by CalculationsSection and VerdictBox to apply unit conversions.
 */
export function convertValueByUnit(
  value: number,
  unit: string,
  system: 'SI' | 'imperial',
): { display: string; unit: string } {
  if (system !== 'imperial') {
    const dec = unit === '' ? 4 : unit === 'N/mm' || unit === 'lbf/in' ? 2 : 4;
    return { display: value.toFixed(dec), unit };
  }
  switch (unit) {
    case 'N':     return { display: (value / 4.44822).toFixed(2),    unit: 'lbf' };
    case 'kN':    return { display: (value / 4.44822).toFixed(3),    unit: 'kips' };
    case 'N·m':   return { display: (value * 8.8507).toFixed(3),     unit: 'lbf·in' };
    case 'N·mm':  return { display: (value * 0.0088507).toFixed(3),  unit: 'lbf·in' };
    case 'MPa':   return { display: (value * 145.038).toFixed(1),    unit: 'psi' };
    case 'mm':    return { display: (value / 25.4).toFixed(4),       unit: 'in' };
    case 'mm²':   return { display: (value / 645.16).toFixed(5),     unit: 'in²' };
    case 'N/mm':  return { display: (value * 5.7102).toFixed(2),     unit: 'lbf/in' };
    default:      return { display: value.toFixed(4),                unit };
  }
}
