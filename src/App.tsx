import React, { Suspense, useState } from 'react';
import { flushSync } from 'react-dom';
import { BookOpen, House, Sun, Moon, PanelLeftClose, PanelLeftOpen, ArrowLeft } from 'lucide-react';
import { CalculatorProvider, useCalculator } from '@/context/CalculatorContext';
import type { ActiveTab } from '@/context/CalculatorContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { Landing } from '@/components/landing/Landing';
import { PARTS, partOfTab } from '@/components/landing/parts';
import { InputPanel }   from '@/components/InputPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { UserManual }   from '@/components/UserManual';

const PowerScrewWorkspace = React.lazy(() => import('@/features/powerScrew/ui/PowerScrewWorkspace'));

// ── Piezas (calculadoras) ─────────────────────────────────────────────────────
const TAB_REF: Record<ActiveTab, string> = {
  power: 'Shigley §8-1, §8-2', tension: 'Shigley §8-3 – §8-11', shear: 'Shigley §8-12',
};
const SHORT: Record<ActiveTab, string> = { power: 'Potencia', tension: 'Tensión', shear: 'Cortante' };

/** Cambia de vista con una transición del navegador (si existe y no se pidió reducir movimiento). */
function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce) { update(); return; }
  doc.startViewTransition(() => flushSync(update));
}

const Ball: React.FC<{ n: number; active?: boolean }> = ({ n, active }) => (
  <span className={active ? 'bom-ball bom-ball-on' : 'bom-ball'} aria-hidden="true">{n}</span>
);

// ── Barra lateral: lista de piezas ────────────────────────────────────────────
interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onGoHome: () => void;
  onOpenManual: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}
const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onGoHome, onOpenManual, collapsed, onToggleCollapsed }) => (
  <aside className={[
    'fixed left-0 top-0 h-full bg-surface-container-lowest border-r border-outline-variant z-50 hidden lg:flex flex-col transition-[width] duration-200',
    collapsed ? 'w-16' : 'w-64',
  ].join(' ')}>
    {/* Marca + ocultar/mostrar (misma altura que el cajetín) */}
    <div className={['h-14 shrink-0 border-b border-outline-variant flex items-center gap-2', collapsed ? 'px-3 justify-center' : 'pl-5 pr-3'].join(' ')}>
      {!collapsed && (
        <button onClick={onGoHome} className="text-left flex-1 min-w-0 group" aria-label="Ir a la portada">
          <span className="font-mono text-[17px] font-bold tracking-wider text-on-surface group-hover:opacity-80 transition-opacity">
            CALC<span className="text-primary">MECH</span>
          </span>
        </button>
      )}
      <button
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-sm text-on-surface-variant hover:text-primary hover:bg-surface-variant transition-colors"
      >
        {collapsed
          ? <PanelLeftOpen size={18} strokeWidth={1.75} aria-hidden="true" />
          : <PanelLeftClose size={18} strokeWidth={1.75} aria-hidden="true" />}
      </button>
    </div>

    {/* Lista de piezas */}
    <nav className="flex-1 overflow-y-auto custom-scrollbar" aria-label="Calculadoras">
      {!collapsed && (
        <p className="px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant">
          Lista de piezas
        </p>
      )}
      {PARTS.map(p => {
        const active = activeTab === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onTabChange(p.id)}
            title={collapsed ? p.name : undefined}
            aria-label={collapsed ? `Pieza ${p.no}: ${p.name}` : undefined}
            aria-current={active ? 'page' : undefined}
            style={{ viewTransitionName: `pieza-${p.no}` } as React.CSSProperties}
            className={[
              'w-full flex items-center gap-3 py-2.5 text-left border-b border-outline-variant transition-colors',
              collapsed ? 'justify-center px-0' : 'px-4',
              active ? 'text-primary font-bold bg-surface-container-high' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface',
            ].join(' ')}
          >
            <Ball n={p.no} active={active} />
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-sans text-[12.5px] font-semibold leading-tight">{p.name}</div>
                <div className="font-mono text-[9px] text-on-surface-variant/60 leading-tight mt-0.5">{TAB_REF[p.id]}</div>
              </div>
            )}
          </button>
        );
      })}
    </nav>

    {/* Abajo */}
    <div className="p-3 border-t border-outline-variant space-y-0.5">
      <button
        onClick={onOpenManual}
        title={collapsed ? 'Manual de uso' : undefined}
        aria-label={collapsed ? 'Manual de uso' : undefined}
        className={['w-full flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-sm transition-all', collapsed ? 'justify-center' : 'px-3'].join(' ')}
      >
        <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />
        {!collapsed && <span className="font-mono text-[10px] uppercase tracking-widest">Manual de uso</span>}
      </button>
      <button
        onClick={onGoHome}
        title={collapsed ? 'Portada' : undefined}
        aria-label={collapsed ? 'Portada' : undefined}
        className={['w-full flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-sm transition-all', collapsed ? 'justify-center' : 'px-3'].join(' ')}
      >
        <House size={18} strokeWidth={1.75} aria-hidden="true" />
        {!collapsed && <span className="font-mono text-[10px] uppercase tracking-widest">Portada</span>}
      </button>
    </div>
  </aside>
);

// ── Barra superior: cajetín ───────────────────────────────────────────────────
interface TopBarProps {
  sidebarCollapsed: boolean;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onGoHome: () => void;
  isImperial: boolean;
  onSetSI: () => void;
  onSetImperial: () => void;
}
const Cell: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className = '', children }) => (
  <div className={`tb-cell ${className}`}>
    <span className="tb-label">{label}</span>
    {children}
  </div>
);
const TopBar: React.FC<TopBarProps> = ({
  sidebarCollapsed, activeTab, onTabChange, onGoHome, isImperial, onSetSI, onSetImperial
}) => {
  const part = partOfTab(activeTab);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header
      className={`tb-bar fixed top-0 right-0 w-full ${sidebarCollapsed ? 'lg:w-[calc(100%-4rem)]' : 'lg:w-[calc(100%-16rem)]'} transition-[width] duration-200 h-14 z-40`}
      style={{ viewTransitionName: 'cajetin' } as React.CSSProperties}
      aria-label="Cajetín"
    >
      <button onClick={onGoHome} className="tb-cell tb-back lg:hidden" aria-label="Portada">
        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <Cell label="Elemento" className="tb-grow">
        <strong className="tb-value text-primary truncate">{part.name}</strong>
      </Cell>
      <Cell label="Pieza" className="hidden sm:flex">
        <span className="tb-value font-mono">{part.no} de {PARTS.length}</span>
      </Cell>
      {/* Piezas en pantallas sin barra lateral */}
      <div className="tb-cell tb-row lg:hidden" role="group" aria-label="Calculadoras">
        {PARTS.map(p => (
          <button key={p.id} onClick={() => onTabChange(p.id)} title={p.name} aria-label={p.name}
            aria-current={activeTab === p.id ? 'page' : undefined}
            className={['px-1.5 py-0.5 rounded text-[10px] font-mono font-bold', activeTab === p.id ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-variant'].join(' ')}>
            <span className="hidden sm:inline">{SHORT[p.id]}</span><span className="sm:hidden">{p.no}</span>
          </button>
        ))}
      </div>
      <Cell label="Unidades">
        <div className="flex rounded overflow-hidden border border-outline-variant text-[11px] font-mono" role="group" aria-label="Sistema de unidades">
          <button onClick={onSetSI} aria-pressed={!isImperial}
            className={['px-2 py-0.5 font-bold transition-all', !isImperial ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-variant'].join(' ')}>SI</button>
          <button onClick={onSetImperial} aria-pressed={isImperial}
            aria-label="Imperial"
            className={['px-2 py-0.5 font-bold transition-all border-l border-outline-variant', isImperial ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-variant'].join(' ')}>
            <span className="hidden sm:inline">Imperial</span><span className="sm:hidden" aria-hidden="true">Imp</span>
          </button>
        </div>
      </Cell>
      <button onClick={toggleTheme} className="tb-cell tb-btn" aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
        <span className="tb-label">Tema</span>
        {isDark ? <Sun size={16} strokeWidth={1.75} aria-hidden="true" /> : <Moon size={16} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <Cell label="Periodo" className="hidden md:flex">
        <span className="tb-value font-mono">2026-1</span>
      </Cell>
    </header>
  );
};

// ── Main app ─────────────────────────────────────────────────────────────────
const AppInner: React.FC = () => {
  const [view, setView] = useState<'home' | 'calculator'>('home');
  const [manualOpen, setManualOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('fc-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const toggleSidebar = () => setSidebarCollapsed(c => {
    try { localStorage.setItem('fc-sidebar-collapsed', c ? '0' : '1'); } catch { /* sin almacenamiento */ }
    return !c;
  });
  const { state, setActiveTab, setUnitSystem } = useCalculator();
  const isImperial = state.unitSystem === 'imperial';

  const handleEnter = (tab: ActiveTab) => withTransition(() => {
    setActiveTab(tab);
    setView('calculator');
  });
  const goHome = () => withTransition(() => setView('home'));

  if (view === 'home') {
    return (
      <>
        <Landing onEnter={handleEnter} onOpenManual={() => setManualOpen(true)} />
        <UserManual open={manualOpen} onClose={() => setManualOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface technical-grid">

      <UserManual open={manualOpen} onClose={() => setManualOpen(false)} />

      <Sidebar
        activeTab={state.activeTab}
        onTabChange={setActiveTab}
        onGoHome={goHome}
        onOpenManual={() => setManualOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />

      {/* ── Content area ── */}
      <div className={`flex flex-col flex-1 min-w-0 transition-[margin] duration-200 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>

        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          activeTab={state.activeTab}
          onTabChange={setActiveTab}
          onGoHome={goHome}
          isImperial={isImperial}
          onSetSI={() => setUnitSystem('SI')}
          onSetImperial={() => setUnitSystem('imperial')}
        />

        {state.activeTab === 'power' ? (
        <main className="flex-1 overflow-hidden mt-14 min-h-0">
          <Suspense fallback={<div className="p-4 text-sm font-mono">Cargando…</div>}>
            <PowerScrewWorkspace system={state.unitSystem} />
          </Suspense>
        </main>
        ) : (
        /* Two-column workspace */
        <main className="flex flex-1 overflow-hidden mt-14">

          {/* Left: Input panel */}
          <div className="w-full sm:w-80 xl:w-96 shrink-0 border-r border-outline-variant overflow-y-auto custom-scrollbar bg-surface-container-low/40">
            <div className="p-3 pb-6">
              <p className="text-[9px] font-mono uppercase tracking-widest text-primary/60 mb-2 px-0.5">
                Datos de entrada
              </p>
              <Suspense fallback={
                <div className="text-on-surface-variant text-sm p-4 font-mono animate-pulse">
                  Cargando módulo…
                </div>
              }>
                <InputPanel />
              </Suspense>
            </div>
          </div>

          {/* Right: Results panel */}
          <div className="flex-1 overflow-y-auto custom-scrollbar min-w-0">
            <div className="p-3 pb-6">
              <p className="text-[9px] font-mono uppercase tracking-widest text-primary/60 mb-2 px-0.5">
                Resultados
              </p>
              <ResultsPanel />
            </div>
          </div>
        </main>
        )}

        {/* Footer */}
        <footer className="shrink-0 text-center text-[9px] font-mono text-on-surface-variant/35 py-2 border-t border-outline-variant">
          Norton, <em>Diseño de Máquinas</em> 4ª Ed. §11 &nbsp;·&nbsp; Shigley, <em>Diseño en Ingeniería Mecánica</em> 9ª Ed. §8
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <CalculatorProvider>
      <AppInner />
    </CalculatorProvider>
  </ThemeProvider>
);

export default App;
