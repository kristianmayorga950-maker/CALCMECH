// NOTE: This component is no longer used — kept for reference only.
import React, { useMemo, useState } from 'react';

// Local type definitions (previously imported from types.ts which was refactored)
interface RotscherElement { E_GPa: number; thickness: number; dw?: number; kind?: 'plate' | 'washer'; label?: string; }
type JointType = 'through' | 'tapped';

// Stub: function removed from calculations.ts (Cornwell method replaced Rotscher)
function memberStiffnessRotscherFull(
  _elements: RotscherElement[], _d: number, _alpha: number,
  _opts?: { jointType?: JointType; dwHead?: number; dwNut?: number },
): { km: number; k_head: number; k_nut: number; l_grip: number; l_eff: number; frustums: any[] } {
  return { km: 0, k_head: 0, k_nut: 0, l_grip: 0, l_eff: 0, frustums: [] };
}

/* ── Constantes de dibujo ──────────────────────────────────────────────── */
const SVG_W      = 640;
const PAD_X      = 60;
const PAD_Y      = 64;        // más aire arriba/abajo para cotas Dw
const HEAD_H     = 14;
const BOLT_COLOR = '#212121';
const CENTER_X   = SVG_W / 2;

/* Offsets horizontales (desde el borde del plato) para cada cota — separadas. */
const OFF_THICK_TEXT = 26;    // texto de cota de espesor
const OFF_THICK_LINE_OUT = 30; // línea exterior vertical de cota espesor
const OFF_THICK_LINE_IN  = 22; // líneas horizontales (ticks)
const OFF_MID_TEXT   = 58;    // texto "plano medio" (antes pegado a -8)
const OFF_GRIP       = 82;    // cota grip total (antes -40)

/** Colores por material (mapeados por E_GPa redondeado). */
const MAT_COLORS: Record<number, { fill: string; stroke: string; name: string }> = {
  207: { fill: '#75757520', stroke: '#616161', name: 'Acero' },
  71:  { fill: '#22c55e20', stroke: '#22c55e', name: 'Aluminio' },
  119: { fill: '#f59e0b20', stroke: '#f59e0b', name: 'Cobre' },
  100: { fill: '#a855f720', stroke: '#a855f7', name: 'Hierro colado' },
  114: { fill: '#06b6d420', stroke: '#06b6d4', name: 'Titanio' },
  30:  { fill: '#78716c20', stroke: '#78716c', name: 'Hormigon' },
};
const DEFAULT_COLOR = { fill: '#21212120', stroke: '#212121', name: 'Material' };

function getMatColor(E_GPa: number) {
  const rounded = Math.round(E_GPa);
  return MAT_COLORS[rounded] ?? DEFAULT_COLOR;
}

/* ── Datos de arandelas estándar ISO 7089 ─────────────────────────────── */
export const WASHER_TABLE: Record<number, { od: number; t: number }> = {
  5:  { od: 10,  t: 1.0 },
  6:  { od: 12,  t: 1.6 },
  8:  { od: 16,  t: 1.6 },
  10: { od: 20,  t: 2.0 },
  12: { od: 24,  t: 2.5 },
  14: { od: 28,  t: 2.5 },
  16: { od: 30,  t: 3.0 },
  18: { od: 34,  t: 3.0 },
  20: { od: 37,  t: 3.0 },
  22: { od: 39,  t: 3.0 },
  24: { od: 44,  t: 4.0 },
  27: { od: 50,  t: 4.0 },
  30: { od: 56,  t: 4.0 },
  36: { od: 66,  t: 5.0 },
};

export function getWasherForBolt(d_mm: number): { od: number; t: number } | null {
  const keys = Object.keys(WASHER_TABLE).map(Number).sort((a, b) => a - b);
  if (WASHER_TABLE[d_mm]) return WASHER_TABLE[d_mm];
  let best = keys[0];
  for (const k of keys) if (Math.abs(k - d_mm) < Math.abs(best - d_mm)) best = k;
  return WASHER_TABLE[best] ?? null;
}

/* ── Props ─────────────────────────────────────────────────────────────── */
export interface RotscherConeVisualizerProps {
  boltDiameter: number;       // d [mm]
  elements: RotscherElement[];
  alpha?: number;             // grados (default 30)
  jointType?: JointType;      // 'through' | 'tapped'
  dwHead?: number;            // mm — default 1.5·d
  dwNut?: number;             // mm — default 1.5·d (through)
  gripUnit?: 'mm' | 'in';
}

/* ── Componente ────────────────────────────────────────────────────────── */
export const RotscherConeVisualizer: React.FC<RotscherConeVisualizerProps> = ({
  boltDiameter: d,
  elements,
  alpha = 30,
  jointType = 'through',
  dwHead,
  dwNut,
  gripUnit = 'mm',
}) => {
  const [hoveredMember, setHoveredMember] = useState<number | null>(null);

  const data = useMemo(() => {
    if (!elements.length || d <= 0) return null;

    const Dw_h = dwHead ?? 1.5 * d;
    const Dw_n = dwNut  ?? 1.5 * d;

    const r = memberStiffnessRotscherFull(
      elements, d, alpha, { jointType, dwHead: Dw_h, dwNut: Dw_n },
    );
    if (r.l_grip <= 0) return null;

    // Escala: ajustar l_grip + cabeza + tuerca al alto disponible
    const availH = 340;
    const scale = Math.min(availH / (r.l_grip + 2 * d), 7, Math.max(0.9, 120 / r.l_grip));

    const boltR_px  = (d / 2) * scale;
    const totalH_px = r.l_grip * scale;
    const headW_px  = Dw_h * scale;   // ancho cara de cabeza
    const nutW_px   = Dw_n * scale;   // ancho cara de tuerca / cara roscada

    // y-origen: cara inferior de la cabeza
    const y0         = PAD_Y + HEAD_H + 4;
    const y_mid_mm   = r.l_eff / 2;       // desde cara cabeza (en mm)
    const y_midplane = y0 + y_mid_mm * scale;
    const y_nutFace  = y0 + r.l_grip * scale;
    // Para tapped: cara efectiva de la rosca = l_eff desde cabeza
    const y_tappedFace = y0 + r.l_eff * scale;

    // Coordenadas por elemento
    const memberGeos = elements.map((el, idx) => {
      const yStart_mm = elements.slice(0, idx).reduce((s, e) => s + e.thickness, 0);
      const yStart    = y0 + yStart_mm * scale;
      const h         = el.thickness * scale;
      const matColor  = getMatColor(el.E_GPa);
      const label     = el.label || (el.kind === 'washer' ? 'Arandela' : `Placa ${idx + 1}`);
      return { idx, el, yStart, h, yEnd: yStart + h, matColor, label, yStart_mm };
    });

    // Ancho máximo de cono a cualquier profundidad (para fijar drawable width)
    const maxD_mm = Math.max(
      ...r.frustums.map(f => Math.max(f.D_in, f.D_out)),
      Dw_h, Dw_n,
    );
    const maxR_px = (maxD_mm / 2) * scale;

    return {
      ...r, memberGeos, scale, boltR_px, totalH_px, headW_px, nutW_px,
      y0, y_midplane, y_nutFace, y_tappedFace, y_mid_mm, maxR_px,
      Dw_h, Dw_n,
    };
  }, [d, elements, alpha, jointType, dwHead, dwNut]);

  if (!data) {
    return (
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 p-4 text-center text-xs text-slate-500">
        Agregue elementos y defina el diámetro del perno para ver la visualización.
      </div>
    );
  }

  const {
    km, k_head, k_nut, l_grip, l_eff, memberGeos, scale, boltR_px, totalH_px,
    headW_px, nutW_px, y0, y_midplane, y_nutFace, y_tappedFace, maxR_px,
    Dw_h, Dw_n,
  } = data;

  // Polígonos de los dos conos (mitad derecha — luego se espeja para la izquierda)
  const DwHead_r_px  = (Dw_h / 2) * scale;
  const DwNut_r_px   = (Dw_n / 2) * scale;
  const tanA         = Math.tan((alpha * Math.PI) / 180);
  const D_mid_head_r = DwHead_r_px + (l_eff / 2) * scale * tanA;
  const D_mid_nut_r  = DwNut_r_px  + (l_eff / 2) * scale * tanA;
  // Los dos conos deben encontrarse en la misma R en el plano medio (simétrico si Dw iguales).
  // En asimétrico, matemáticamente el "plano medio" se desplaza; usamos la formulación estándar
  // que lo fija en l_eff/2, así que D_mid_head ≠ D_mid_nut por Dw distintos.
  const y_headOrigin = y0;
  const y_nutOrigin  = jointType === 'tapped' ? y_tappedFace : y_nutFace;
  const y_midHead    = y_headOrigin + (l_eff / 2) * scale;
  const y_midNut     = y_nutOrigin  - (l_eff / 2) * scale;

  // Cono cabeza (lado derecho): Dw_h/2 arriba → D_mid_head_r en plano medio
  const headConeR = [
    `${CENTER_X + DwHead_r_px},${y_headOrigin}`,
    `${CENTER_X + D_mid_head_r},${y_midHead}`,
    `${CENTER_X + boltR_px},${y_midHead}`,
    `${CENTER_X + boltR_px},${y_headOrigin}`,
  ].join(' ');
  const headConeL = [
    `${CENTER_X - DwHead_r_px},${y_headOrigin}`,
    `${CENTER_X - D_mid_head_r},${y_midHead}`,
    `${CENTER_X - boltR_px},${y_midHead}`,
    `${CENTER_X - boltR_px},${y_headOrigin}`,
  ].join(' ');
  // Cono tuerca (lado derecho): Dw_n/2 abajo → D_mid_nut_r en plano medio (por arriba)
  const nutConeR = [
    `${CENTER_X + DwNut_r_px},${y_nutOrigin}`,
    `${CENTER_X + D_mid_nut_r},${y_midNut}`,
    `${CENTER_X + boltR_px},${y_midNut}`,
    `${CENTER_X + boltR_px},${y_nutOrigin}`,
  ].join(' ');
  const nutConeL = [
    `${CENTER_X - DwNut_r_px},${y_nutOrigin}`,
    `${CENTER_X - D_mid_nut_r},${y_midNut}`,
    `${CENTER_X - boltR_px},${y_midNut}`,
    `${CENTER_X - boltR_px},${y_nutOrigin}`,
  ].join(' ');

  // Alto del SVG: incluye espacio para las cotas Dw arriba y Dw_tuerca abajo
  const svgH = y0 + totalH_px + HEAD_H + 36 + PAD_Y;
  const fmtLen = (mm: number) =>
    gripUnit === 'in' ? `${(mm / 25.4).toFixed(3)} in` : `${mm.toFixed(1)} mm`;

  // Ancho del dibujo (plato): usa el máximo entre Dw y el ancho al plano medio + 18 px
  const plateHalfW = Math.max(maxR_px, DwHead_r_px, DwNut_r_px) + 24;

  return (
    <div className="space-y-2">
      {/* Header: km + k_head + k_nut */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
          Vista de corte — dos conos de presión (α = {alpha}°, {jointType === 'tapped' ? 'tapped / Tabla 8-7b' : 'pasante / Tabla 8-7a'})
        </span>
        <div className="flex gap-3 text-xs font-mono">
          <span className="text-blue-400">k<sub>cabeza</sub> = {isFinite(k_head) ? (k_head / 1000).toFixed(0) : '—'} kN/mm</span>
          <span className="text-emerald-400">k<sub>{jointType === 'tapped' ? 'tap' : 'tuerca'}</sub> = {isFinite(k_nut) ? (k_nut / 1000).toFixed(0) : '—'} kN/mm</span>
          <span className="text-orange-400 font-bold">k<sub>m</sub> = {(km / 1000).toFixed(0)} kN/mm</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-950/60 p-2 overflow-x-auto">
        <svg viewBox={`0 0 ${SVG_W} ${svgH}`} className="w-full" style={{ maxHeight: 460, minHeight: 240 }}>
          <defs>
            <linearGradient id="cone-head" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#757575" stopOpacity={0.30} />
              <stop offset="100%" stopColor="#757575" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="cone-nut" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor="#212121" stopOpacity={0.30} />
              <stop offset="100%" stopColor="#212121" stopOpacity={0.05} />
            </linearGradient>
            <pattern id="bolt-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="#212121" strokeWidth="0.5" />
            </pattern>
            <pattern id="tapped-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="#212121" strokeWidth="0.6" />
            </pattern>
          </defs>

          {/* Eje del perno — se extiende por encima para albergar etiqueta CL y cota Dw */}
          <line x1={CENTER_X} y1={PAD_Y - 42} x2={CENTER_X} y2={svgH - PAD_Y + 24}
                stroke="#212121" strokeWidth="0.5" strokeDasharray="6 3" />
          <text x={CENTER_X + 6} y={PAD_Y - 36}
                fill="#212121" fontSize="8" fontFamily="monospace">CL</text>

          {/* Cabeza del perno */}
          <rect
            x={CENTER_X - headW_px / 2} y={y0 - HEAD_H - 2}
            width={headW_px} height={HEAD_H} rx={2}
            fill="url(#bolt-hatch)" stroke={BOLT_COLOR} strokeWidth="1"
          />
          <text x={CENTER_X} y={y0 - HEAD_H / 2} textAnchor="middle" dominantBaseline="central"
                fill="#212121" fontSize="8" fontWeight="600">CABEZA</text>

          {/* Placas del paquete (rectángulos horizontales a full ancho disponible) */}
          {memberGeos.map((m) => {
            const isHovered = hoveredMember === m.idx;
            return (
              <g key={m.idx}
                 onMouseEnter={() => setHoveredMember(m.idx)}
                 onMouseLeave={() => setHoveredMember(null)}
                 style={{ cursor: 'pointer' }}>
                <rect
                  x={CENTER_X - plateHalfW} y={m.yStart}
                  width={plateHalfW * 2} height={m.h}
                  fill={m.matColor.fill}
                  stroke={m.matColor.stroke}
                  strokeWidth={isHovered ? 1.5 : 0.6}
                  strokeDasharray={m.el.kind === 'washer' ? '3 2' : undefined}
                />
                {/* Etiqueta a la derecha */}
                <text
                  x={CENTER_X + plateHalfW + 8}
                  y={m.yStart + m.h / 2}
                  dominantBaseline="central"
                  fill={m.matColor.stroke}
                  fontSize="9"
                  fontWeight={isHovered ? '700' : '500'}
                >
                  {m.label}
                  {m.el.kind === 'washer' ? '' : ` — ${m.matColor.name}`}
                </text>
                {/* Cota espesor (izquierda) — separada de plano-medio y cota grip */}
                {m.h > 8 && (
                  <>
                    <line x1={CENTER_X - plateHalfW - OFF_THICK_LINE_OUT} y1={m.yStart}
                          x2={CENTER_X - plateHalfW - OFF_THICK_LINE_OUT} y2={m.yEnd}
                          stroke="#212121" strokeWidth="0.5" />
                    <line x1={CENTER_X - plateHalfW - OFF_THICK_LINE_OUT - 4} y1={m.yStart}
                          x2={CENTER_X - plateHalfW - OFF_THICK_LINE_IN}     y2={m.yStart}
                          stroke="#212121" strokeWidth="0.5" />
                    <line x1={CENTER_X - plateHalfW - OFF_THICK_LINE_OUT - 4} y1={m.yEnd}
                          x2={CENTER_X - plateHalfW - OFF_THICK_LINE_IN}     y2={m.yEnd}
                          stroke="#212121" strokeWidth="0.5" />
                    <text x={CENTER_X - plateHalfW - OFF_THICK_TEXT} y={m.yStart + m.h / 2}
                          textAnchor="end" dominantBaseline="central"
                          fill="#212121" fontSize="8" fontFamily="monospace">
                      {fmtLen(m.el.thickness)}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Cono del lado de la cabeza */}
          <polygon points={headConeR} fill="url(#cone-head)" stroke="#757575" strokeWidth="1.1" strokeDasharray="5 3" opacity={0.95} />
          <polygon points={headConeL} fill="url(#cone-head)" stroke="#757575" strokeWidth="1.1" strokeDasharray="5 3" opacity={0.95} />

          {/* Cono del lado de la tuerca/tapped */}
          <polygon points={nutConeR} fill="url(#cone-nut)" stroke="#212121" strokeWidth="1.1" strokeDasharray="5 3" opacity={0.95} />
          <polygon points={nutConeL} fill="url(#cone-nut)" stroke="#212121" strokeWidth="1.1" strokeDasharray="5 3" opacity={0.95} />

          {/* Marcas horizontales en interfaces entre capas: mostrar diámetro del cono al cruzar */}
          {data.frustums.map((f, k) => {
            // y de la interfaz = y_in → y_out en el lado correspondiente
            const yIn  = f.side === 'head'
              ? y0 + (elements.slice(0, f.memberIdx).reduce((s, e) => s + e.thickness, 0)) * scale
              : y_nutOrigin - (elements.slice(f.memberIdx + 1).reduce((s, e) => s + e.thickness, 0) + f.t) * scale;
            // Posición exacta de la entrada del sub-tronco
            const Din_r = (f.D_in / 2) * scale;
            return (
              <g key={`intf-${k}`} opacity={0.7}>
                <circle cx={CENTER_X + Din_r} cy={yIn} r={1.8} fill={f.side === 'head' ? '#757575' : '#212121'} />
                <circle cx={CENTER_X - Din_r} cy={yIn} r={1.8} fill={f.side === 'head' ? '#757575' : '#212121'} />
              </g>
            );
          })}

          {/* Vástago del perno (dibujado sobre las placas para verse encima) */}
          <rect
            x={CENTER_X - boltR_px} y={y0}
            width={boltR_px * 2} height={totalH_px}
            fill="#424242" stroke={BOLT_COLOR} strokeWidth="0.8"
          />
          {Array.from({ length: Math.floor(totalH_px / 4) }, (_, i) => (
            <line key={`th${i}`}
                  x1={CENTER_X - boltR_px} y1={y0 + i * 4 + 2}
                  x2={CENTER_X + boltR_px} y2={y0 + i * 4 + 2}
                  stroke="#bdbdbd" strokeWidth="0.3" />
          ))}

          {/* Tuerca (through) o hatch de rosca (tapped) */}
          {jointType === 'through' ? (
            <>
              <rect x={CENTER_X - nutW_px / 2} y={y0 + totalH_px + 2}
                    width={nutW_px} height={HEAD_H} rx={2}
                    fill="url(#bolt-hatch)" stroke={BOLT_COLOR} strokeWidth="1" />
              <text x={CENTER_X} y={y0 + totalH_px + 2 + HEAD_H / 2}
                    textAnchor="middle" dominantBaseline="central"
                    fill="#212121" fontSize="8" fontWeight="600">TUERCA</text>
            </>
          ) : (
            // Tapped: indica plano efectivo de rosca a profundidad d/2 en el último miembro
            <>
              <line x1={CENTER_X - plateHalfW + 4} y1={y_tappedFace}
                    x2={CENTER_X + plateHalfW - 4} y2={y_tappedFace}
                    stroke="#212121" strokeWidth="0.8" strokeDasharray="3 2" />
              <text x={CENTER_X + plateHalfW + 8} y={y_tappedFace}
                    dominantBaseline="central"
                    fill="#212121" fontSize="8" fontStyle="italic">
                cara ef. rosca (d/2)
              </text>
            </>
          )}

          {/* Plano medio — etiqueta movida a la DERECHA (con leader) para no chocar con las cotas de espesor */}
          <line x1={CENTER_X - plateHalfW - 6} y1={y_midHead}
                x2={CENTER_X + plateHalfW + 6} y2={y_midHead}
                stroke="#ff9800" strokeWidth="0.8" strokeDasharray="2 2" opacity={0.8} />
          {(() => {
            const xMidText = CENTER_X + plateHalfW + 110;
            return (
              <>
                {/* leader punteado desde el borde derecho del plato hasta la etiqueta */}
                <line x1={CENTER_X + plateHalfW + 6} y1={y_midHead}
                      x2={xMidText - 2} y2={y_midHead}
                      stroke="#ff9800" strokeWidth="0.5" strokeDasharray="1 2" opacity={0.7} />
                <text x={xMidText} y={y_midHead}
                      dominantBaseline="central"
                      fill="#ff9800" fontSize="8" fontWeight="600" fontFamily="monospace">
                  plano medio
                </text>
              </>
            );
          })()}

          {/* Cota grip total (naranja, muy a la izquierda — fuera de las cotas de espesor) */}
          {(() => {
            const xDim = CENTER_X - plateHalfW - OFF_GRIP;
            return (
              <>
                <line x1={xDim} y1={y0} x2={xDim} y2={y_nutFace} stroke="#ff9800" strokeWidth="0.8" />
                <line x1={xDim - 4} y1={y0} x2={xDim + 4} y2={y0} stroke="#ff9800" strokeWidth="0.8" />
                <line x1={xDim - 4} y1={y_nutFace} x2={xDim + 4} y2={y_nutFace} stroke="#ff9800" strokeWidth="0.8" />
                <text x={xDim - 3} y={(y0 + y_nutFace) / 2}
                      textAnchor="end" dominantBaseline="central"
                      fill="#ff9800" fontSize="9" fontWeight="700" fontFamily="monospace">
                  l = {fmtLen(l_grip)}
                </text>
                {jointType === 'tapped' && (
                  <text x={xDim - 3} y={(y0 + y_nutFace) / 2 + 12}
                        textAnchor="end" dominantBaseline="central"
                        fill="#212121" fontSize="7" fontFamily="monospace">
                    l_eff = {fmtLen(l_eff)}
                  </text>
                )}
              </>
            );
          })()}

          {/* Dw_cabeza — arriba del todo con cota entre ticks, bien separada del eje CL y de CABEZA */}
          {(() => {
            const yDw       = y0 - HEAD_H - 14;
            const halfHead  = headW_px / 2;
            const tickHover = 4;
            return (
              <>
                <line x1={CENTER_X - halfHead} y1={yDw} x2={CENTER_X + halfHead} y2={yDw}
                      stroke="#f44336" strokeWidth="0.6" />
                <line x1={CENTER_X - halfHead} y1={yDw - tickHover} x2={CENTER_X - halfHead} y2={yDw + tickHover}
                      stroke="#f44336" strokeWidth="0.6" />
                <line x1={CENTER_X + halfHead} y1={yDw - tickHover} x2={CENTER_X + halfHead} y2={yDw + tickHover}
                      stroke="#f44336" strokeWidth="0.6" />
                <rect x={CENTER_X - 56} y={yDw - 8} width={112} height={11} fill="#ffffff" opacity={0.85} rx={1} />
                <text x={CENTER_X} y={yDw - 1} textAnchor="middle"
                      fill="#f44336" fontSize="8" fontWeight="600" fontFamily="monospace">
                  Dw_cabeza = {fmtLen(Dw_h)}
                </text>
              </>
            );
          })()}

          {/* Dw_tuerca — abajo del todo, bien separada de TUERCA */}
          {jointType === 'through' && (() => {
            const yDw       = y_nutFace + HEAD_H + 22;
            const halfNut   = nutW_px / 2;
            const tickHover = 4;
            return (
              <>
                <line x1={CENTER_X - halfNut} y1={yDw} x2={CENTER_X + halfNut} y2={yDw}
                      stroke="#f44336" strokeWidth="0.6" />
                <line x1={CENTER_X - halfNut} y1={yDw - tickHover} x2={CENTER_X - halfNut} y2={yDw + tickHover}
                      stroke="#f44336" strokeWidth="0.6" />
                <line x1={CENTER_X + halfNut} y1={yDw - tickHover} x2={CENTER_X + halfNut} y2={yDw + tickHover}
                      stroke="#f44336" strokeWidth="0.6" />
                <rect x={CENTER_X - 56} y={yDw + 3} width={112} height={11} fill="#ffffff" opacity={0.85} rx={1} />
                <text x={CENTER_X} y={yDw + 11} textAnchor="middle"
                      fill="#f44336" fontSize="8" fontWeight="600" fontFamily="monospace">
                  Dw_tuerca = {fmtLen(Dw_n)}
                </text>
              </>
            );
          })()}
        </svg>
      </div>

      {/* Tabla detallada con los sub-troncos de cada cono */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-700/40">
              <th className="text-left py-1.5 px-2 font-medium">Cono</th>
              <th className="text-left py-1.5 px-2 font-medium">Capa</th>
              <th className="text-right py-1.5 px-2 font-medium">E (GPa)</th>
              <th className="text-right py-1.5 px-2 font-medium">t ({gripUnit})</th>
              <th className="text-right py-1.5 px-2 font-medium">D<sub>in</sub> → D<sub>out</sub> ({gripUnit})</th>
              <th className="text-right py-1.5 px-2 font-medium">k<sub>sub</sub> (kN/mm)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {data.frustums.map((f, k) => {
              const fmtL = (mm: number) =>
                gripUnit === 'in' ? (mm / 25.4).toFixed(4) : mm.toFixed(2);
              const sideColor = f.side === 'head' ? 'text-blue-400' : 'text-emerald-400';
              const sideLbl   = f.side === 'head' ? 'cabeza' : (jointType === 'tapped' ? 'tap' : 'tuerca');
              return (
                <tr key={k}
                    className={hoveredMember === f.memberIdx ? 'bg-slate-800/50' : ''}
                    onMouseEnter={() => setHoveredMember(f.memberIdx)}
                    onMouseLeave={() => setHoveredMember(null)}>
                  <td className={`py-1 px-2 font-semibold ${sideColor}`}>{sideLbl}</td>
                  <td className="py-1 px-2 text-slate-300">#{f.memberIdx + 1}</td>
                  <td className="py-1 px-2 text-right font-mono text-slate-300">{f.E_GPa}</td>
                  <td className="py-1 px-2 text-right font-mono text-slate-300">{fmtL(f.t)}</td>
                  <td className="py-1 px-2 text-right font-mono text-slate-400">
                    {fmtL(f.D_in)} → {fmtL(f.D_out)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-semibold text-orange-300">
                    {isFinite(f.ki) && f.ki > 0 ? (f.ki / 1000).toFixed(1) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-700/40 bg-slate-900/60">
              <td colSpan={5} className="py-1.5 px-2 text-right text-slate-400 uppercase text-[10px] tracking-wider">
                k<sub>cabeza</sub> (serie) =
              </td>
              <td className="py-1.5 px-2 text-right font-mono font-bold text-blue-400 text-sm">
                {isFinite(k_head) ? (k_head / 1000).toFixed(0) : '—'} <span className="text-[10px] font-normal">kN/mm</span>
              </td>
            </tr>
            <tr className="bg-slate-900/60">
              <td colSpan={5} className="py-1.5 px-2 text-right text-slate-400 uppercase text-[10px] tracking-wider">
                k<sub>{jointType === 'tapped' ? 'tap' : 'tuerca'}</sub> (serie) =
              </td>
              <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400 text-sm">
                {isFinite(k_nut) ? (k_nut / 1000).toFixed(0) : '—'} <span className="text-[10px] font-normal">kN/mm</span>
              </td>
            </tr>
            <tr className="border-t border-orange-500/30 bg-orange-500/5">
              <td colSpan={5} className="py-2 px-2 text-right font-semibold text-orange-400 uppercase tracking-wider text-[10px]">
                k<sub>m</sub> = (1/k<sub>cabeza</sub> + 1/k<sub>{jointType === 'tapped' ? 'tap' : 'tuerca'}</sub>)<sup>-1</sup> =
              </td>
              <td className="py-2 px-2 text-right font-mono font-bold text-orange-400 text-sm">
                {(km / 1000).toFixed(0)} <span className="text-[10px] font-normal">kN/mm</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-[10px] text-slate-600 px-1 leading-relaxed">
        Shigley §8-5 / Tabla 8-7. Los <span className="text-blue-400">dos conos principales</span> se originan en las
        caras de apriete (Dw<sub>cabeza</sub>, Dw<sub>{jointType === 'tapped' ? 'tap' : 'tuerca'}</sub>) y se expanden con
        semi-ángulo α = {alpha}° hasta el plano medio. Cuando el cono cruza una interfaz entre materiales distintos el
        diámetro se mantiene continuo (D<sub>out</sub> anterior = D<sub>in</sub> siguiente); sólo cambia E. Cada sub-tronco
        aporta k<sub>sub</sub> por la Ec. 8-20; se combinan en serie y los dos conos también en serie.
        {jointType === 'tapped' && ' El cono tapped se origina a d/2 de profundidad en el miembro roscado.'}
      </p>
    </div>
  );
};
