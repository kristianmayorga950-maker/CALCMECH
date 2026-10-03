/**
 * Plano de conjunto de la portada: un gato de tornillo en corte cuyas piezas
 * numeradas son las tres calculadoras (1 tornillo de potencia, 2 pernos a
 * tensión de la base, 3 ménsula con pernos a cortante). SVG como texto, puro.
 * Cada pieza es un grupo `.part[data-part]` enfocable; la portada delega los
 * eventos. Los trazos llevan pathLength="1" para el trazado inicial.
 */

/* eslint-disable max-len */
export function assemblySvg(names: readonly string[]): string {
  const cx=330;
  const H = (x: number, y: number, w: number, h: number, cls = 'ln') =>`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" pathLength="1"/>`;
  const P = (d: string, cls = 'ln') =>`<path class="${cls}" d="${d}" pathLength="1"/>`;
  const defs=`<defs>
    <pattern id="lp-ah" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--sx-hatch)" stroke-width="1"/></pattern>
    <pattern id="lp-ab" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="5" height="5" fill="var(--sx-bronze-cut)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--sx-bronze-lo)" stroke-width="1"/></pattern>
    <pattern id="lp-ac" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="var(--sx-hatch)" stroke-width=".7"/><line x1="5" y1="0" x2="5" y2="10" stroke="var(--sx-hatch)" stroke-width=".7" stroke-dasharray="2 2"/></pattern>
    <linearGradient id="lp-am" x1="0" x2="1"><stop offset="0" stop-color="var(--sx-metal-lo)"/><stop offset=".45" stop-color="var(--sx-metal-hi)"/><stop offset="1" stop-color="var(--sx-metal-mid)"/></linearGradient>
    <marker id="lp-aa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" fill="var(--sx-force)"/></marker>
    <marker id="lp-ad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" fill="var(--sx-dim)"/></marker>
  </defs>`;
  const o: string[] = [];
  // Bastidor: piso en corte y columna izquierda
  o.push(`<g class="fillin"><rect x="60" y="500" width="520" height="34" fill="url(#lp-ac)"/><rect x="60" y="150" width="40" height="350" fill="url(#lp-ac)"/></g>`);
  o.push(P(`M60 534H580M60 500H140M520 500H580M100 500V150H60V534`));
  o.push(`<text class="lab" x="470" y="552">bastidor</text>`);

  // --- Pieza 2: brida del cuerpo y pernos a tensión ---
  const bx=[cx-95,cx+95];
  let p2=`<g class="fillin"><path d="M${cx-118} 478H${cx+118}V500H${cx-118}Z" fill="url(#lp-ah)"/></g>`;
  bx.forEach(x => {
    p2+=`<g class="fillin"><rect x="${x-6}" y="476" width="12" height="70" fill="url(#lp-am)"/><rect x="${x-15}" y="466" width="30" height="12" fill="url(#lp-am)"/><rect x="${x-17}" y="534" width="34" height="4" fill="url(#lp-am)"/><rect x="${x-15}" y="538" width="30" height="12" fill="url(#lp-am)"/></g>`;
    p2+=H(x-6,476,12,70,'thin')+H(x-15,466,30,12)+H(x-15,538,30,12)+H(x-17,534,34,4,'thin');
    for(let y=500;y<546;y+=4)p2+=`<line class="thin" x1="${x-6}" y1="${y}" x2="${x+6}" y2="${y+2}" stroke-opacity=".6"/>`;
  });
  p2+=P(`M${cx-118} 478H${cx+118}V500H${cx-118}Z`);
  const p2hl=`<path class="hl" d="M${cx-122} 452H${cx+122}V554H${cx-122}Z"/>`;

  // --- Cuerpo del gato (corte) con tuerca de bronce ---
  const body=`M${cx-90} 478L${cx-42} 300H${cx-17}V478Z M${cx+90} 478L${cx+42} 300H${cx+17}V478Z`;
  o.push(`<g class="fillin"><path d="${body}" fill="url(#lp-ah)"/><rect x="${cx-42}" y="300" width="25" height="62" fill="url(#lp-ab)"/><rect x="${cx+17}" y="300" width="25" height="62" fill="url(#lp-ab)"/></g>`);
  o.push(P(body)+H(cx-42,300,25,62,'thin')+H(cx+17,300,25,62,'thin'));
  o.push(`<text class="lab" x="${cx-150}" y="330">tuerca</text><line class="thin" x1="${cx-108}" y1="326" x2="${cx-34}" y2="326"/>`);
  o.push(`<text class="lab" x="${cx-158}" y="420">cuerpo</text><line class="thin" x1="${cx-108}" y1="416" x2="${cx-62}" y2="416"/>`);

  // --- Pieza 1: tornillo, collarín, plataforma y palanca ---
  let p1=`<g class="fillin"><rect x="${cx-15}" y="150" width="30" height="322" fill="url(#lp-am)"/>`;
  for(let y=196;y<470;y+=10)p1+=`<path d="M${cx-15} ${y}l-3 2v5l3 2M${cx+15} ${y}l3 2v5l-3 2" fill="var(--sx-metal-mid)" stroke="var(--lp-ink)" stroke-width=".6"/>`;
  p1+=`<rect x="${cx-34}" y="140" width="68" height="10" fill="url(#lp-ab)"/><rect x="${cx-52}" y="118" width="104" height="22" fill="url(#lp-am)"/><rect x="${cx-24}" y="156" width="48" height="28" fill="url(#lp-am)"/><rect x="${cx+24}" y="165" width="210" height="10" rx="5" fill="url(#lp-am)"/></g>`;
  p1+=H(cx-15,150,30,322)+H(cx-34,140,68,10,'thin')+H(cx-52,118,104,22)+H(cx-24,156,48,28)+`<rect class="ln" x="${cx+24}" y="165" width="210" height="10" rx="5" pathLength="1"/>`;
  p1+=`<line class="force" x1="${cx}" y1="62" x2="${cx}" y2="114" marker-end="url(#lp-aa)"/><text class="forcet" x="${cx+8}" y="78">F</text>`;
  p1+=`<line class="force" x1="${cx+222}" y1="128" x2="${cx+222}" y2="161" marker-end="url(#lp-aa)"/><text class="forcet" x="${cx+230}" y="140">P</text>`;
  p1+=`<text class="lab" x="${cx+62}" y="134">collarín</text>`;
  const p1hl=`<path class="hl" d="M${cx-56} 112H${cx+56}V160H${cx+240}V180H${cx+26}V476H${cx-26}V188H${cx-56}Z"/>`;

  // --- Pieza 3: ménsula guía unida a la columna con 4 pernos ---
  let p3=`<g class="fillin"><path d="M100 220H170V296H100Z" fill="var(--sx-metal-mid)" fill-opacity=".55"/><path d="M170 236H${cx-30}V250H170Z" fill="url(#lp-am)"/><path d="M170 250L210 250L170 284Z" fill="var(--sx-metal-mid)" fill-opacity=".55"/><rect x="${cx-30}" y="230" width="60" height="26" fill="url(#lp-ab)"/></g>`;
  p3+=P(`M100 220H170V296H100`)+P(`M170 236H${cx-30}M170 250H210L170 284`)+H(cx-30,230,60,26,'thin');
  ([[118, 236], [152, 236], [118, 280], [152, 280]] as const).forEach(([x, y]) =>{p3+=`<circle class="thin" cx="${x}" cy="${y}" r="6.5" fill="var(--sx-metal-hi)" pathLength="1"/><path class="thin" d="M${x-3.5} ${y-2}l3.5-2 3.5 2v4l-3.5 2-3.5-2z" pathLength="1"/>`;});
  p3+=`<text class="lab" x="${cx+40}" y="247">guía</text>`;
  const p3hl=`<path class="hl" d="M96 214H174V230H${cx+34}V260H214L174 300H96Z"/>`;

  // Ejes, cota de carrera
  o.push(`<line class="ax" x1="${cx}" y1="100" x2="${cx}" y2="560"/>`);
  o.push(`<line class="dim" x1="${cx+150}" y1="118" x2="${cx+150}" y2="300" marker-start="url(#lp-ad)" marker-end="url(#lp-ad)"/><text class="dimt" x="${cx+156}" y="214">carrera</text>`);
  o.push(`<line class="thin" x1="${cx+54}" y1="118" x2="${cx+156}" y2="118" stroke-opacity=".5"/><line class="thin" x1="${cx+44}" y1="300" x2="${cx+156}" y2="300" stroke-opacity=".5"/>`);

  // Piezas con globo
  const bal = (n: number, bx: number, by: number, tx: number, ty: number) =>`<g class="bal"><line x1="${bx}" y1="${by}" x2="${tx}" y2="${ty}"/><circle class="dot" cx="${tx}" cy="${ty}" r="2.4"/><circle cx="${bx}" cy="${by}" r="15"/><text x="${bx}" y="${by+5}">${n}</text></g>`;
  const part = (n: number, inner: string, hl: string, b: string) =>`<g class="part" data-part="${n}" tabindex="0" role="button" aria-label="Pieza ${n}: ${names[n - 1]}. Abrir la calculadora">${hl}${inner}${b}</g>`;
  o.push(part(2,p2,p2hl,bal(2,cx+190,430,cx+100,462)));
  o.push(part(3,p3,p3hl,bal(3,150,180,135,224)));
  o.push(part(1,p1,p1hl,bal(1,cx+190,370,cx+16,380)));
  o.push(`<text class="ttl" x="64" y="584">GATO DE TORNILLO · CONJUNTO</text><text class="lab" x="64" y="600">Piezas 1 a 3: una calculadora por pieza</text>`);
  return `<svg viewBox="40 50 560 560" role="img" aria-label="Plano de conjunto de un gato de tornillo en corte: pieza 1, tornillo de potencia con tuerca, collarín y palanca; pieza 2, base unida al bastidor con pernos a tensión; pieza 3, ménsula guía unida a la columna con cuatro pernos a cortante.">${defs}${o.join('')}</svg>`;
}
