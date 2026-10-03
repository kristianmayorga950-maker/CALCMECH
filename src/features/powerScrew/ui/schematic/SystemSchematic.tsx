import { useMemo, useRef, useState, type SyntheticEvent } from 'react';
import type { EngineResult, ProblemConfig } from '../../engine/types';
import { drawSystem, describe } from './schematic';
import { schematicInput, type ProjectSnapshot } from './fromState';

const OPEN_KEY = 'calcmech-power-screw:schematic-open';

function readOpen(): boolean {
  try { return window.localStorage.getItem(OPEN_KEY) !== '0'; } catch { return true; }
}

/** Esquema del sistema elegido, en vivo con la configuración y los valores conocidos. */
export function SystemSchematic({ cfg, values }: { cfg: ProblemConfig; values: EngineResult['values'] }) {
  const inp = useMemo(() => schematicInput(cfg, values), [cfg, values]);
  const svg = useMemo(() => drawSystem(inp), [inp]);
  // Copia aparte para la vista grande: cada dibujo lleva sus propios ids internos.
  const big = useMemo(() => drawSystem(inp), [inp]);
  const [open, setOpen] = useState(readOpen);
  const dlg = useRef<HTMLDialogElement>(null);
  const onToggle = (e: SyntheticEvent<HTMLDetailsElement>) => {
    const now = e.currentTarget.open;
    setOpen(now);
    try { window.localStorage.setItem(OPEN_KEY, now ? '1' : '0'); } catch { /* sin almacenamiento */ }
  };
  return (
    <details className="ps-schem" open={open} onToggle={onToggle}>
      <summary className="ps-schem-head">
        <span className="ps-schem-title">Esquema del sistema</span>
        <span className="ps-schem-desc">{describe(inp)}</span>
      </summary>
      {/* SVG generado por drawSystem: rótulos propios y escapados, sin datos externos. */}
      <div className="ps-schem-body" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="ps-schem-foot">
        <p className="ps-schem-note">Las cotas muestran el valor cuando ya se conoce; las punteadas esperan su dato. El dibujo no está a escala.</p>
        <button type="button" className="ps-schem-zoom" onClick={() => dlg.current?.showModal()}>Ver en grande</button>
      </div>
      <dialog ref={dlg} className="ps-schem-dlg" aria-label="Esquema del sistema" onClick={e => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className="ps-schem-dlg-head">
          <span className="ps-schem-title">Esquema del sistema</span>
          <button type="button" className="ps-schem-zoom" onClick={() => dlg.current?.close()} autoFocus>Cerrar</button>
        </div>
        <div className="ps-schem-dlg-body" dangerouslySetInnerHTML={{ __html: big }} />
      </dialog>
    </details>
  );
}

/** Miniatura de un proyecto: mecanismo dibujado, sello del veredicto, criterio que gobierna, F y d. */
export function ProjectThumbnail({ snap }: { snap: ProjectSnapshot }) {
  const svg = useMemo(() => drawSystem(snap.input), [snap.input]);
  const fd = [
    snap.F !== undefined ? `F ${snap.F >= 1000 ? `${(snap.F / 1000).toFixed(snap.F >= 1e5 ? 0 : 1)} kN` : `${Math.round(snap.F)} N`}` : null,
    snap.d !== undefined ? `d ${+snap.d.toFixed(2)} mm` : null,
  ].filter(Boolean).join(' · ');
  return (
    <span className="ps-thumb">
      <span className="ps-thumb-img" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="ps-thumb-info">
        {snap.governing && <span className="ps-thumb-line ps-mono">{snap.governing}</span>}
        {fd && <span className="ps-thumb-line ps-mono">{fd}</span>}
        <span className={`ps-stamp ps-stamp-${snap.status}`}>{snap.stamp}</span>
      </span>
    </span>
  );
}
