import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, FileText, Sun, Moon, ArrowRight, Play } from 'lucide-react';
import type { ActiveTab } from '@/context/CalculatorContext';
import { useTheme } from '@/context/ThemeContext';
import { assemblySvg } from './assembly';
import { PARTS } from './parts';
import { drawSystem } from '@/features/powerScrew/ui/schematic/schematic';
import { projectSnapshot, type ProjectSnapshot } from '@/features/powerScrew/ui/schematic/fromState';
import { getStore } from '@/features/powerScrew/ui/storage';
import { listProjects } from '@/features/powerScrew/state/persistence';
import { loadSession, saveSession, type Session } from '@/features/powerScrew/state/session';
import type { ProblemState } from '@/features/powerScrew/state/problemState';
import './landing.css';

interface LandingProps {
  onEnter: (tab: ActiveTab) => void;
  onOpenManual: () => void;
}

/** El trazado del dibujo se ve una sola vez por carga de la página. */
let traced = false;

const BASE = import.meta.env.BASE_URL;

function when(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? `hoy, ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function fd(s: ProjectSnapshot): string {
  return [
    s.F !== undefined ? `F ${s.F >= 1000 ? `${+(s.F / 1000).toFixed(1)} kN` : `${Math.round(s.F)} N`}` : null,
    s.d !== undefined ? `d ${+s.d.toFixed(2)} mm` : null,
  ].filter(Boolean).join(' · ');
}

/** Ranura de partida: miniatura del mecanismo, nombre, fecha, criterio que gobierna, F y d, sello. */
const Slot: React.FC<{ name: string; date: string; state: ProblemState; onOpen: () => void; label: string }> = ({ name, date, state, onOpen, label }) => {
  const snap = useMemo(() => projectSnapshot(state), [state]);
  const svg = useMemo(() => drawSystem(snap.input), [snap]);
  const meta = fd(snap);
  return (
    <button type="button" className="lp-slot" onClick={onOpen} aria-label={`${label}: ${name}`}>
      <span className="lp-slot-th" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="lp-slot-tx">
        <span className="lp-slot-name">{name}</span>
        <span className="lp-slot-meta">{[date, snap.governing].filter(Boolean).join(' · ')}</span>
        {meta && <span className="lp-slot-meta">{meta}</span>}
        <span className={`lp-stamp lp-stamp-${snap.status}`}>{snap.stamp}</span>
      </span>
    </button>
  );
};

export const Landing: React.FC<LandingProps> = ({ onEnter, onOpenManual }) => {
  const { theme, toggleTheme } = useTheme();
  const [hover, setHover] = useState<number | null>(null);
  const [pending, setPending] = useState<{ name: string; id: string; state: ProblemState } | null>(null);
  const dwg = useRef<HTMLDivElement>(null);
  const [trace] = useState(() => { const t = !traced; traced = true; return t; });

  const svg = useMemo(() => assemblySvg(PARTS.map(p => p.name)), []);
  const store = useMemo(() => getStore(), []);
  const [session] = useState<Session | null>(() => loadSession(store));
  const projects = useMemo(() => listProjects(store).slice(0, 6), [store]);

  // Adelanta la carga del tornillo de potencia mientras se mira la portada.
  useEffect(() => { void import('@/features/powerScrew/ui/PowerScrewWorkspace'); }, []);

  // Resalta en el dibujo la pieza señalada (desde el dibujo o desde la lista).
  useEffect(() => {
    dwg.current?.querySelectorAll<SVGGElement>('.part').forEach(g => g.classList.toggle('on', Number(g.dataset.part) === hover));
  }, [hover]);

  const partOf = (t: EventTarget | null) => {
    const g = (t as Element | null)?.closest?.('[data-part]') as HTMLElement | null;
    return g ? Number(g.dataset.part) : null;
  };
  const enterPart = (n: number) => onEnter(PARTS[n - 1].id);

  const openProject = (p: { name: string; id: string; state: ProblemState }) => {
    saveSession(store, p.name, p.state, { projectId: p.id });
    onEnter('power');
  };
  // Si hay trabajo sin guardar en la sesión, se pide confirmación antes de reemplazarlo.
  const requestOpen = (p: { name: string; id: string; state: ProblemState }) => {
    if (session && !session.projectId) setPending(p); else openProject(p);
  };

  return (
    <div className="lp-root">
      <div className="lp-page">
        <nav className="lp-top" aria-label="Accesos">
          <button type="button" className="lp-link" onClick={onOpenManual}><BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />Manual de uso</button>
          <a className="lp-link" href={`${BASE}Manual_de_Usuario_CALCMECH.pdf`} target="_blank" rel="noopener noreferrer"><FileText size={16} strokeWidth={1.75} aria-hidden="true" />Manual en PDF</a>
          <a className="lp-link" href={`${BASE}Capacidades_CALCMECH.pdf`} target="_blank" rel="noopener noreferrer"><FileText size={16} strokeWidth={1.75} aria-hidden="true" />Capacidades en PDF</a>
          <button type="button" className="lp-link lp-icon" onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro (plano)' : 'Cambiar a tema oscuro (cianotipo)'}>
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} aria-hidden="true" /> : <Moon size={16} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        </nav>

        <section className="lp-sheet" aria-label="Plano de conjunto">
          <div className="lp-frame"><div className="lp-frame-in">
            <div className="lp-dwg">
              <div className="lp-dwg-h"><span>Conjunto · gato de tornillo · corte A-A</span><span>Esc. 1:5</span></div>
              <div
                ref={dwg}
                className={trace ? 'lp-dwg-svg trace' : 'lp-dwg-svg'}
                dangerouslySetInnerHTML={{ __html: svg }}
                onClick={e => { const n = partOf(e.target); if (n) enterPart(n); }}
                onKeyDown={e => { const n = partOf(e.target); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); enterPart(n); } }}
                onMouseOver={e => setHover(partOf(e.target))}
                onMouseLeave={() => setHover(null)}
                onFocus={e => setHover(partOf(e.target))}
                onBlur={() => setHover(null)}
              />
            </div>

            <div className="lp-side">
              <div className="lp-brand">
                <h1 className="lp-name">CALC<b>MECH</b></h1>
                <p>Elementos roscados calculados paso por paso: ecuación, sustitución y resultado.</p>
              </div>

              <div className="lp-bom">
                <div className="lp-bom-h" aria-hidden="true"><span>Pza.</span><span>Denominación · qué resuelve</span><span>Abrir</span></div>
                <ul aria-label="Lista de piezas">
                  {PARTS.map(p => (
                    <li key={p.no}>
                      <button type="button" className={hover === p.no ? 'lp-row on' : 'lp-row'}
                        style={{ viewTransitionName: `pieza-${p.no}` } as React.CSSProperties}
                        onClick={() => enterPart(p.no)}
                        onMouseEnter={() => setHover(p.no)} onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(p.no)} onBlur={() => setHover(null)}>
                        <span className="lp-no"><span className="lp-ball">{p.no}</span></span>
                        <span><span className="lp-rn">{p.name}</span><span className="lp-rd">{p.desc}</span></span>
                        <span className="lp-go"><ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /><span className="lp-sr">Abrir</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lp-tb" style={{ viewTransitionName: 'cajetin' } as React.CSSProperties} aria-label="Cajetín">
                <div className="lp-tb-logo"><img src={`${BASE}uis-logo.png`} alt="Universidad Industrial de Santander" /></div>
                <div className="lp-wide"><small>Curso</small><strong>Diseño de Máquinas II</strong></div>
                <div className="lp-wide"><small>Escuela</small><strong>Escuela de Ingeniería Mecánica · UIS</strong></div>
                <div><small>Periodo</small><strong>2026-1</strong></div>
                <div><small>Lámina</small><strong>1 de 1</strong></div>
                <div><small>Unidades</small><strong>SI · imperial</strong></div>
                <div><small>Piezas</small><strong>3</strong></div>
              </div>
            </div>
          </div></div>
        </section>

        <section className="lp-saves" aria-label="Partidas guardadas">
          <div className="lp-col">
            <h2 className="lp-h2">Continuar</h2>
            {session ? (
              <Slot name={session.name} date={when(session.savedAt)} state={session.state} label="Continuar" onOpen={() => onEnter('power')} />
            ) : (
              <div className="lp-empty">
                <p>Aquí aparecerá lo último que hiciste en el tornillo de potencia, para seguir donde quedaste.</p>
                <button type="button" className="lp-cta" onClick={() => onEnter('power')}><Play size={15} strokeWidth={1.75} aria-hidden="true" />Empezar con el tornillo de potencia</button>
              </div>
            )}
          </div>
          <div className="lp-col">
            <h2 className="lp-h2">Proyectos guardados</h2>
            {pending && (
              <div className="lp-confirm" role="alertdialog" aria-label="Reemplazar la sesión sin guardar">
                <p>Lo que tienes abierto en el tornillo no está guardado como proyecto. Si abres «{pending.name}», se reemplaza.</p>
                <div className="lp-confirm-row">
                  <button type="button" className="lp-cta" onClick={() => openProject(pending)}>Abrir de todos modos</button>
                  <button type="button" className="lp-link" onClick={() => setPending(null)}>Cancelar</button>
                </div>
              </div>
            )}
            {projects.length ? (
              <div className="lp-slots">
                {projects.map(p => (
                  <Slot key={p.id} name={p.name} date={when(p.savedAt)} state={p.state} label="Abrir proyecto" onOpen={() => requestOpen({ name: p.name, id: p.id, state: p.state })} />
                ))}
              </div>
            ) : (
              <p className="lp-empty-tx">Todavía no hay proyectos. En el tornillo de potencia, el menú «Proyecto» guarda el que tengas abierto y aquí aparece con su dibujo.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Landing;
