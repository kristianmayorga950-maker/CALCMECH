/**
 * Diseño iterativo de tornillos de potencia — Shigley §8-1 / §8-2.
 *
 * Barre el producto cartesiano {cuerdas estándar} × {materiales} reutilizando
 * `PowerScrewCalculator` (las fórmulas no cambian) y rankea los candidatos para
 * recomendar el MENOR tamaño que cumple el factor de seguridad objetivo.
 *
 * Las tablas se reciben como argumentos (arrays ya resueltos) para que la función
 * sea pura y testeable sin `fetch` y pueda ejecutarse dentro del Web Worker.
 */

import { PowerScrewCalculator } from './calculations';
import type { PowerScrewInput, PowerScrewMaterial } from './types';
import type { ThreadData } from '@/utils/threadTables';

/** Datos fijos del problema: todo `PowerScrewInput` salvo lo que barre el diseño. */
export type PowerScrewSweepBase = Omit<PowerScrewInput, 'majorDiameter' | 'pitch' | 'material'>;

export interface PowerScrewCandidate {
  /** Clave única cuerda+material, p.ej. "1-1/4 | Acero medio (1040 HR)". */
  key:               string;
  nominal:           string;   // designación de la cuerda
  dM:                number;   // mm — diámetro mayor
  dr:                number;   // mm — diámetro menor
  materialName:      string;
  Sy:                number;   // MPa
  n:                 number;   // Sy / σ' (Von Mises del cuerpo)
  selfLocking:       boolean;
  efficiencyPercent: number;
  TtotalNm:          number;   // N·m — par total para elevar
  sigmaVonMises:     number;   // MPa
  bearing:           number;   // MPa — aplastamiento del filete
  viable:            boolean;  // n >= targetN
}

export interface PowerScrewSweepResult {
  candidates:     PowerScrewCandidate[];
  recommendedKey?: string;       // menor cuerda viable; undefined si ninguna cumple
  targetN:        number;
  threadStandard: string;
}

/**
 * Ejecuta el barrido cuerda × material.
 * @param base       Datos fijos del problema.
 * @param threads    Tabla de cuerdas a barrer (p.ej. Acme).
 * @param materials  Materiales candidatos (deben traer Sy > 0).
 * @param targetN    Factor de seguridad mínimo deseado (Sy/σ').
 * @param threadStandard  Etiqueta informativa de la tabla usada.
 */
export function sweepPowerScrew(
  base: PowerScrewSweepBase,
  threads: ThreadData[],
  materials: PowerScrewMaterial[],
  targetN: number,
  threadStandard = 'acme',
): PowerScrewSweepResult {
  const candidates: PowerScrewCandidate[] = [];

  for (const th of threads) {
    for (const mat of materials) {
      if (!mat || !(mat.Sy > 0)) continue;
      try {
        const res = new PowerScrewCalculator({
          ...base,
          majorDiameter: th.dM,
          pitch:         th.pitch,
          material:      mat,
        }).calculate();

        const n = res.indicators.safetyFactorYield;
        if (n == null || !Number.isFinite(n)) continue;

        candidates.push({
          key:               `${th.nominal} | ${mat.name}`,
          nominal:           th.nominal,
          dM:                th.dM,
          dr:                res.geometry.dr,
          materialName:      mat.name,
          Sy:                mat.Sy,
          n,
          selfLocking:       res.indicators.selfLocking,
          efficiencyPercent: res.indicators.efficiencyPercent,
          TtotalNm:          res.torques.Ttotal / 1000,
          sigmaVonMises:     res.bodyStress.sigmaVonMises,
          bearing:           res.threadStress.bearing,
          viable:            n >= targetN,
        });
      } catch {
        /* combinación inválida — se omite */
      }
    }
  }

  // Orden: diámetro ascendente, luego mayor n (más holgado primero).
  candidates.sort((a, b) => (a.dM - b.dM) || (b.n - a.n));

  // Recomendado = primer viable = menor cuerda que cumple targetN.
  const recommended = candidates.find(c => c.viable);

  return {
    candidates,
    recommendedKey: recommended?.key,
    targetN,
    threadStandard,
  };
}
