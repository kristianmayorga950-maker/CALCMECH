/**
 * Esquema técnico paramétrico del tornillo de potencia (SVG como texto, puro).
 *
 * Dibuja en elevación con corte parcial: bastidor y tuerca rayados, tornillo
 * metálico con su perfil de rosca (cuadrada o Acme) en la zona de la tuerca,
 * el apoyo de empuje (collarín plano o rodamiento axial), la entrada (volante,
 * palanca o motor con sinfín) y la carga (compresión o tensión), con cotas.
 * Las cotas llevan el valor real cuando existe; si falta, se dibujan
 * punteadas y sin número. Los colores salen de variables CSS --sx-* (con
 * valores por defecto), así el mismo dibujo sirve en claro, oscuro, cianotipo
 * o cuaderno.
 */

export type SxThread = 'square' | 'acme';
export type SxInput = 'direct' | 'lever' | 'reducer';
export type SxThrust = 'none' | 'collar' | 'bearing';
export type SxLoad = 'compression' | 'tension';

export interface SchematicDims {
  d?: number;    // mm
  p?: number;    // mm
  dc?: number;   // mm
  r?: number;    // mm
  F?: number;    // N
  L?: number;    // mm
  P?: number;    // N
  T?: number;    // N·mm
  i?: number;
  eta?: number;
}

export interface SchematicInput {
  thread: SxThread;
  input: SxInput;
  thrust: SxThrust;
  load: SxLoad;
  hands?: 1 | 2;
  dims?: SchematicDims;
  /** Miniatura: sin cotas ni rótulos, trazos más gruesos. */
  compact?: boolean;
  /** Texto alternativo; si falta se genera uno. */
  title?: string;
}

let uid = 0;
const n = (x: number) => (Math.round(x * 10) / 10).toString();

function fmt(x: number): string {
  if (!Number.isFinite(x)) return '';
  const a = Math.abs(x);
  const dec = a >= 1000 ? 0 : a >= 100 ? 0 : a >= 10 ? 1 : 2;
  return x.toFixed(dec).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
const kN = (N: number) => (Math.abs(N) >= 1000 ? `${fmt(N / 1000)} kN` : `${fmt(N)} N`);
const mm = (v: number) => `${fmt(v)} mm`;

/** Texto SVG con subíndice opcional (sin guiones bajos crudos). */
function label(x: number, y: number, base: string, sub: string | null, value: string | null, anchor = 'start', cls = 'sx-t'): string {
  const s = sub ? `<tspan font-style="italic">${base}</tspan><tspan baseline-shift="sub" font-size="0.72em">${sub}</tspan>` : `<tspan font-style="italic">${base}</tspan>`;
  const v = value ? `<tspan> = ${value}</tspan>` : '';
  return `<text class="${cls}" x="${n(x)}" y="${n(y)}" text-anchor="${anchor}">${s}${v}</text>`;
}

/**
 * Devuelve el SVG completo. Ancho fijo de dibujo 640 × 440 (escala con el contenedor).
 */
export function drawSystem(inp: SchematicInput): string {
  const id = `sx${++uid}`;
  const dm = inp.dims ?? {};
  const compact = !!inp.compact;
  const W = 640, H = 440;
  const cx = 300;                     // eje del tornillo
  // Proporciones visuales (no a escala, pero coherentes con los datos).
  const ratioDc = dm.dc && dm.d ? Math.min(2.6, Math.max(1.15, dm.dc / dm.d)) : 1.6;
  const rs = 26;                      // radio mayor dibujado del tornillo
  const rr = 19;                      // radio de raíz dibujado
  const pitch = 16;                   // paso dibujado
  const yBaseTop = 360, yBaseBot = 392;     // bastidor (placa base)
  const yNutTop = 268, yNutBot = yBaseTop;  // tuerca fija en el bastidor
  const yScrewBot = 384;
  const yCap = inp.input === 'reducer' ? 92 : 112;  // cabeza / plataforma de carga
  const yScrewTop = yCap + 26;
  const thrustH = inp.thrust === 'none' ? 0 : 16;
  const collarR = rs * ratioDc;
  const sw = compact ? 2.4 : 1.6;

  const parts: string[] = [];
  // Extensión horizontal ocupada: el viewBox se recorta a ella (más grande en pantalla).
  let x0 = cx - 195, x1 = cx + 200;
  const title = inp.title ?? describe(inp);

  // ── Definiciones: degradados metálicos, rayado de corte, flechas ──
  parts.push(`<defs>
    <linearGradient id="${id}m" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" style="stop-color:var(--sx-metal-lo,#8a96a3)"/><stop offset=".35" style="stop-color:var(--sx-metal-hi,#eef2f6)"/>
      <stop offset=".6" style="stop-color:var(--sx-metal-mid,#b9c3cd)"/><stop offset="1" style="stop-color:var(--sx-metal-lo,#8a96a3)"/>
    </linearGradient>
    <linearGradient id="${id}b" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" style="stop-color:var(--sx-bronze-lo,#9a6b2f)"/><stop offset=".4" style="stop-color:var(--sx-bronze-hi,#e4b46c)"/><stop offset="1" style="stop-color:var(--sx-bronze-lo,#9a6b2f)"/>
    </linearGradient>
    <radialGradient id="${id}ball" cx=".35" cy=".35" r=".7"><stop offset="0" style="stop-color:var(--sx-metal-hi,#ffffff)"/><stop offset="1" style="stop-color:var(--sx-metal-lo,#7d8894)"/></radialGradient>
    <pattern id="${id}h" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="7" height="7" style="fill:var(--sx-cut-bg,#e9edf1)"/><line x1="0" y1="0" x2="0" y2="7" style="stroke:var(--sx-hatch,#5b6b7c)" stroke-width="1"/></pattern>
    <pattern id="${id}hb" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <rect width="7" height="7" style="fill:var(--sx-bronze-cut,#f1dcb8)"/><line x1="0" y1="0" x2="0" y2="7" style="stroke:var(--sx-bronze-lo,#9a6b2f)" stroke-width="1"/></pattern>
    <marker id="${id}a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" style="fill:var(--sx-dim,#1f5fa8)"/></marker>
    <marker id="${id}f" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--sx-force,#b3261e)"/></marker>
    <style>
      .sx-ink{stroke:var(--sx-ink,#1d2a36);fill:none}
      .sx-solid{stroke:var(--sx-ink,#1d2a36)}
      .sx-thin{stroke:var(--sx-ink,#1d2a36);fill:none;stroke-width:.8}
      .sx-axis{stroke:var(--sx-axis,#6b7a89);stroke-width:.8;stroke-dasharray:14 3 2 3;fill:none}
      .sx-dim{stroke:var(--sx-dim,#1f5fa8);stroke-width:1;fill:none}
      .sx-dimx{stroke:var(--sx-dim,#1f5fa8);stroke-width:1;fill:none;stroke-dasharray:4 3;opacity:.7}
      .sx-force{stroke:var(--sx-force,#b3261e);stroke-width:2.2;fill:none}
      .sx-t{fill:var(--sx-text,#1d2a36);font:13px var(--sx-font,"IBM Plex Mono",ui-monospace,monospace)}
      .sx-tf{fill:var(--sx-force,#b3261e);font:600 13px var(--sx-font,"IBM Plex Mono",ui-monospace,monospace)}
      .sx-tm{fill:var(--sx-muted,#5b6b7c);font:11px var(--sx-font,"IBM Plex Mono",ui-monospace,monospace)}
      .sx-shadow{fill:var(--sx-shadow,rgba(0,0,0,.12))}
    </style>
  </defs>`);

  // Sombra en el piso
  parts.push(`<ellipse class="sx-shadow" cx="${cx}" cy="${yBaseBot + 10}" rx="190" ry="9"/>`);

  // ── Bastidor: placa base + cuerpo que aloja la tuerca (corte rayado) ──
  parts.push(`<rect x="${cx - 175}" y="${yBaseTop}" width="350" height="${yBaseBot - yBaseTop}" fill="url(#${id}h)" class="sx-solid" stroke-width="${sw}"/>`);
  const bodyHalf = 64;
  parts.push(`<path d="M${cx - bodyHalf} ${yBaseTop} L${cx - bodyHalf + 10} ${yNutTop - 6} H${cx - rs - 2} V${yBaseTop} Z" fill="url(#${id}h)" class="sx-solid" stroke-width="${sw}"/>`);
  parts.push(`<path d="M${cx + bodyHalf} ${yBaseTop} L${cx + bodyHalf - 10} ${yNutTop - 6} H${cx + rs + 2} V${yBaseTop} Z" fill="url(#${id}h)" class="sx-solid" stroke-width="${sw}"/>`);

  // ── Tuerca (bronce, en corte) con el perfil de la rosca ──
  const nutX0 = cx - rs - 12, nutX1 = cx + rs + 12;
  parts.push(`<rect x="${nutX0}" y="${yNutTop}" width="${nutX1 - nutX0}" height="${yNutBot - yNutTop}" fill="url(#${id}hb)" class="sx-solid" stroke-width="${sw}"/>`);

  // ── Tornillo: cuerpo metálico + perfil de rosca a ambos lados ──
  const toothPath = (side: 1 | -1, y0: number, y1: number): string => {
    // Perfil del flanco exterior (x crece hacia fuera con `side`).
    let d = `M${cx + side * rr} ${y0}`;
    for (let y = y0; y < y1 - 0.1; y += pitch) {
      const a = Math.min(pitch, y1 - y);
      if (inp.thread === 'square') {
        d += ` V${y + a * 0.25} H${cx + side * rs} V${y + a * 0.75} H${cx + side * rr} V${y + a}`;
      } else {
        // Acme: flancos inclinados (29°), cresta y raíz planas.
        d += ` L${cx + side * rs} ${y + a * 0.33} V${y + a * 0.62} L${cx + side * rr} ${y + a * 0.92} V${y + a}`;
      }
    }
    return d;
  };
  const yThreadTop = yCap + 44 + thrustH, yThreadBot = yScrewBot;
  // Núcleo
  parts.push(`<rect x="${cx - rr}" y="${yScrewTop}" width="${2 * rr}" height="${yScrewBot - yScrewTop}" fill="url(#${id}m)" class="sx-solid" stroke-width="${sw}"/>`);
  // Filetes (relleno metálico entre raíz y cresta)
  for (const side of [1, -1] as const) {
    let d = toothPath(side, yThreadTop, yThreadBot);
    d += ` H${cx + side * rr} Z`;
    parts.push(`<path d="${d}" fill="url(#${id}m)" class="sx-solid" stroke-width="${sw * 0.8}"/>`);
  }
  // Hélices visibles por encima de la tuerca (indicio de rosca)
  if (!compact) {
    for (let y = yThreadTop + pitch * 0.5; y < yNutTop - 4; y += pitch) {
      parts.push(`<path d="M${cx - rs} ${y + 5} L${cx + rs} ${y}" class="sx-thin" opacity=".45"/>`);
    }
  }
  // Eje
  parts.push(`<line class="sx-axis" x1="${cx}" y1="${yCap - 34}" x2="${cx}" y2="${yBaseBot + 18}"/>`);

  // ── Apoyo de empuje y cabeza/plataforma de carga ──
  const yThrustTop = yCap + 26;
  if (inp.thrust === 'collar') {
    parts.push(`<rect x="${cx - collarR}" y="${yThrustTop}" width="${2 * collarR}" height="${thrustH}" fill="url(#${id}hb)" class="sx-solid" stroke-width="${sw}"/>`);
  } else if (inp.thrust === 'bearing') {
    parts.push(`<rect x="${cx - collarR}" y="${yThrustTop}" width="${2 * collarR}" height="4" fill="url(#${id}m)" class="sx-solid" stroke-width="${sw * 0.8}"/>`);
    parts.push(`<rect x="${cx - collarR}" y="${yThrustTop + thrustH - 4}" width="${2 * collarR}" height="4" fill="url(#${id}m)" class="sx-solid" stroke-width="${sw * 0.8}"/>`);
    const nb = Math.max(4, Math.round(collarR / 9));
    for (let k = 0; k < nb; k++) {
      const x = cx - collarR + (k + 0.5) * (2 * collarR / nb);
      parts.push(`<circle cx="${n(x)}" cy="${yThrustTop + thrustH / 2}" r="4" fill="url(#${id}ball)" class="sx-solid" stroke-width=".8"/>`);
    }
  }
  // Plataforma de carga (gira libre sobre el apoyo)
  const capW = Math.max(110, collarR * 2 + 20);
  parts.push(`<rect x="${cx - capW / 2}" y="${yCap}" width="${capW}" height="26" rx="3" fill="url(#${id}m)" class="sx-solid" stroke-width="${sw}"/>`);

  // ── Entrada ──
  const yIn = yThreadTop + 6;   // altura donde entra el par (cabeza del tornillo)
  if (inp.input === 'lever') {
    const rMin = 60, rMax = 230;
    const rDraw = dm.r ? Math.min(rMax, Math.max(rMin, 60 + Math.log10(Math.max(1, dm.r)) * 55)) : 150;
    const hands = inp.hands === 2 ? 2 : 1;
    const xL = hands === 2 ? cx - rDraw : cx - rs - 6;
    x0 = Math.min(x0, xL - 12);
    x1 = Math.max(x1, cx + rDraw + (compact ? 12 : 100));
    parts.push(`<rect x="${n(xL)}" y="${yIn - 5}" width="${n(cx + rDraw - xL)}" height="10" rx="5" fill="url(#${id}m)" class="sx-solid" stroke-width="${sw}"/>`);
    // Fuerza P en el extremo (tangencial: hacia el observador → flecha vertical en vista)
    const pv = dm.P ? kN(dm.P) : null;
    parts.push(`<line class="sx-force" x1="${n(cx + rDraw - 6)}" y1="${yIn - 46}" x2="${n(cx + rDraw - 6)}" y2="${yIn - 9}" marker-end="url(#${id}f)"/>`);
    if (hands === 2) parts.push(`<line class="sx-force" x1="${n(cx - rDraw + 6)}" y1="${yIn + 46}" x2="${n(cx - rDraw + 6)}" y2="${yIn + 9}" marker-end="url(#${id}f)"/>`);
    if (!compact) {
      parts.push(label(cx + rDraw + 4, yIn - 30, 'P', null, pv, 'start', 'sx-tf'));
      // Cota r
      const yR = yIn + 26;
      parts.push(`<line class="${dm.r ? 'sx-dim' : 'sx-dimx'}" x1="${cx}" y1="${yR}" x2="${n(cx + rDraw - 6)}" y2="${yR}" marker-start="url(#${id}a)" marker-end="url(#${id}a)"/>`);
      parts.push(label(cx + rDraw / 2, yR - 5, 'r', null, dm.r ? mm(dm.r) : null, 'middle'));
    }
  } else if (inp.input === 'direct') {
    // Volante en perspectiva sobre la cabeza
    const wr = 70;
    parts.push(`<ellipse cx="${cx}" cy="${yIn}" rx="${wr}" ry="14" class="sx-ink" stroke-width="${sw * 2.2}" style="stroke:var(--sx-metal-lo,#8a96a3)"/>`);
    parts.push(`<ellipse cx="${cx}" cy="${yIn}" rx="${wr}" ry="14" class="sx-ink" stroke-width="${sw * 0.8}"/>`);
    for (const ang of [0, 60, 120]) {
      const a = (ang * Math.PI) / 180;
      parts.push(`<line class="sx-ink" stroke-width="${sw}" x1="${n(cx + Math.cos(a) * wr)}" y1="${n(yIn + Math.sin(a) * 14)}" x2="${n(cx - Math.cos(a) * wr)}" y2="${n(yIn - Math.sin(a) * 14)}"/>`);
    }
    if (!compact) {
      parts.push(`<path class="sx-force" d="M${cx + wr + 14} ${yIn + 10} A ${wr + 14} 22 0 0 0 ${cx + wr - 30} ${yIn - 26}" marker-end="url(#${id}f)"/>`);
      parts.push(label(cx + wr + 18, yIn - 16, 'T', null, dm.T ? `${fmt(dm.T / 1000)} N·m` : null, 'start', 'sx-tf'));
    }
  } else {
    // Reductor: corona acuñada al tornillo justo encima de la tuerca, sinfín y motor a la izquierda
    const yG = yNutTop - 30;
    parts.push(`<rect x="${cx - 62}" y="${yG - 16}" width="124" height="32" rx="4" fill="url(#${id}b)" class="sx-solid" stroke-width="${sw}"/>`);
    for (let x = cx - 56; x <= cx + 56; x += 8) parts.push(`<line class="sx-thin" x1="${x}" y1="${yG - 16}" x2="${x}" y2="${yG + 16}" opacity=".5"/>`);
    // Sinfín (eje horizontal) y motor
    const xw0 = cx - 230, xw1 = cx - 62;
    x0 = Math.min(x0, compact ? xw0 - 8 : xw0 - 50);
    parts.push(`<rect x="${xw0 + 70}" y="${yG - 9}" width="${xw1 - xw0 - 70}" height="18" fill="url(#${id}m)" class="sx-solid" stroke-width="${sw}"/>`);
    for (let x = xw0 + 78; x < xw1 - 4; x += 9) parts.push(`<path class="sx-thin" d="M${x} ${yG - 9} L${x + 6} ${yG + 9}"/>`);
    parts.push(`<rect x="${xw0}" y="${yG - 30}" width="72" height="60" rx="6" fill="url(#${id}m)" class="sx-solid" stroke-width="${sw}"/>`);
    for (let y = yG - 22; y <= yG + 22; y += 8) parts.push(`<line class="sx-thin" x1="${xw0 + 8}" y1="${y}" x2="${xw0 + 64}" y2="${y}" opacity=".6"/>`);
    if (!compact) {
      parts.push(`<text class="sx-tm" x="${xw0 + 36}" y="${yG + 46}" text-anchor="middle">motor</text>`);
      const txt = [dm.i ? `i = ${fmt(dm.i)}` : 'i = ?', dm.eta ? `η = ${fmt(dm.eta)}` : 'η = ?'].join(' · ');
      parts.push(`<text class="sx-tm" x="${xw0 + 36}" y="${yG + 60}" text-anchor="middle">sinfín ${txt}</text>`);
    }
  }

  // ── Carga ──
  const fv = dm.F ? kN(dm.F) : null;
  if (inp.load === 'compression') {
    parts.push(`<line class="sx-force" x1="${cx}" y1="${yCap - 62}" x2="${cx}" y2="${yCap - 4}" marker-end="url(#${id}f)"/>`);
    if (!compact) parts.push(label(cx + 10, yCap - 40, 'F', null, fv, 'start', 'sx-tf'));
  } else {
    parts.push(`<path class="sx-ink" stroke-width="${sw * 1.6}" d="M${cx} ${yCap} V${yCap - 18} M${cx - 10} ${yCap - 18} A 10 10 0 1 1 ${cx + 10} ${yCap - 18}"/>`);
    parts.push(`<line class="sx-force" x1="${cx}" y1="${yCap - 30}" x2="${cx}" y2="${yCap - 80}" marker-end="url(#${id}f)"/>`);
    if (!compact) parts.push(label(cx + 10, yCap - 56, 'F', null, fv ? `${fv} (tensión)` : '(tensión)', 'start', 'sx-tf'));
  }

  if (!compact) {
    // Cota d (diámetro mayor) en la zona de la tuerca
    const yD = inp.input === 'reducer' ? yNutTop - 6 : yNutTop - 12;
    parts.push(`<line class="${dm.d ? 'sx-dim' : 'sx-dimx'}" x1="${cx - rs}" y1="${yD}" x2="${cx + rs}" y2="${yD}" marker-start="url(#${id}a)" marker-end="url(#${id}a)"/>`);
    parts.push(label(cx + bodyHalf + 6, yD + 4, 'd', null, dm.d ? mm(dm.d) : null));
    parts.push(`<line class="sx-thin" x1="${cx + rs}" y1="${yD}" x2="${cx + bodyHalf + 2}" y2="${yD}" opacity=".5"/>`);
    // Cota p a un costado de la tuerca
    const xp = nutX1 + 16, yp0 = yNutTop + 12;
    parts.push(`<line class="${dm.p ? 'sx-dim' : 'sx-dimx'}" x1="${xp}" y1="${yp0}" x2="${xp}" y2="${yp0 + pitch}" marker-start="url(#${id}a)" marker-end="url(#${id}a)"/>`);
    parts.push(label(xp + 6, yp0 + pitch - 2, 'p', null, dm.p ? mm(dm.p) : null));
    // Cota dc del apoyo: dentro del espesor del apoyo, rótulo a la derecha de la plataforma
    if (inp.thrust !== 'none') {
      const yc = yThrustTop + thrustH / 2;
      const xr = cx + Math.max(collarR, capW / 2) + 8;
      parts.push(`<line class="${dm.dc ? 'sx-dim' : 'sx-dimx'}" x1="${n(cx - collarR * 0.7)}" y1="${yc}" x2="${n(cx + collarR * 0.7)}" y2="${yc}" marker-start="url(#${id}a)" marker-end="url(#${id}a)"/>`);
      parts.push(`<line class="sx-thin" x1="${n(cx + collarR * 0.7)}" y1="${yc}" x2="${n(xr - 3)}" y2="${yc}" opacity=".5"/>`);
      parts.push(label(xr, yc + 4, 'd', 'c', dm.dc ? mm(dm.dc) : null));
      parts.push(`<text class="sx-tm" x="${n(cx + capW / 2 + 8)}" y="${yCap + 12}">${inp.thrust === 'collar' ? 'collarín' : 'rodamiento axial'}</text>`);
    }
    // Columna libre L (solo compresión)
    if (inp.load === 'compression') {
      const xl = cx - bodyHalf - 34;
      x0 = Math.min(x0, xl - 100);
      parts.push(`<line class="${dm.L ? 'sx-dim' : 'sx-dimx'}" x1="${xl}" y1="${yThreadTop}" x2="${xl}" y2="${yNutTop}" marker-start="url(#${id}a)" marker-end="url(#${id}a)"/>`);
      parts.push(label(xl - 6, (yThreadTop + yNutTop) / 2 + 4, 'L', null, dm.L ? mm(dm.L) : null, 'end'));
    }
    parts.push(`<text class="sx-tm" x="${nutX0 - 6}" y="${yNutTop + 26}" text-anchor="end">tuerca</text>`);
    parts.push(`<text class="sx-tm" x="${cx - 170}" y="${yBaseBot - 10}">bastidor</text>`);
    parts.push(`<text class="sx-tm" x="${cx}" y="${H - 12}" text-anchor="middle">rosca ${inp.thread === 'acme' ? 'Acme' : 'cuadrada'} · corte parcial</text>`);
  }

  x0 = Math.max(0, x0); x1 = Math.min(W, x1);
  const vb = compact ? `0 0 ${W} ${H}` : `${n(x0)} 0 ${n(x1 - x0)} ${H}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${escapeAttr(title)}"><title>${escapeText(title)}</title>${parts.join('')}</svg>`;
}

/** Descripción en palabras del sistema dibujado (texto alternativo). */
export function describe(inp: SchematicInput): string {
  const inputTxt = inp.input === 'lever' ? (inp.hands === 2 ? 'palanca a dos manos' : 'palanca') : inp.input === 'reducer' ? 'motor con sinfín y corona' : 'volante (par directo)';
  const thrustTxt = inp.thrust === 'collar' ? 'collarín de empuje' : inp.thrust === 'bearing' ? 'rodamiento axial' : 'sin apoyo de empuje';
  return `Tornillo de potencia de rosca ${inp.thread === 'acme' ? 'Acme' : 'cuadrada'} accionado con ${inputTxt}, ${thrustTxt}, carga en ${inp.load === 'compression' ? 'compresión' : 'tensión'}.`;
}

function escapeAttr(s: string) { return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function escapeText(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
