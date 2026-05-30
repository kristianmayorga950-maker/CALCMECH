import React, { Suspense, useState } from 'react';
import { CalculatorProvider, useCalculator } from '@/context/CalculatorContext';
import type { ActiveTab } from '@/context/CalculatorContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { LandingPage } from '@/components/LandingPage';
import { InputPanel }   from '@/components/InputPanel';
import { ResultsPanel } from '@/components/ResultsPanel';
import { UserManual }   from '@/components/UserManual';

// ── Tab metadata ──────────────────────────────────────────────────────────────
const TABS: { id: ActiveTab; emoji: string; label: string; shortLabel: string; ref: string }[] = [
  { id: 'power',   emoji: '⚙️', label: 'Tornillo de Potencia', shortLabel: 'Potencia',  ref: 'Shigley §8-1, §8-2'   },
  { id: 'tension', emoji: '🔩', label: 'Junta a Tensión',      shortLabel: 'Tensión',   ref: 'Shigley §8-3 – §8-11' },
  { id: 'shear',   emoji: '✂️', label: 'Junta a Cortante',     shortLabel: 'Cortante',  ref: 'Shigley §8-12'        },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onGoHome: () => void;
  onOpenManual: () => void;
}
const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onGoHome, onOpenManual }) => (
  <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline-variant z-50 hidden lg:flex flex-col">
    {/* Logo */}
    <div className="p-5 border-b border-outline-variant">
      <button onClick={onGoHome} className="text-left w-full group">
        <h1 className="font-mono text-[17px] font-bold text-primary tracking-tight group-hover:opacity-80 transition-opacity">
          FASTENER CALC
        </h1>
        <p className="text-[9px] font-mono text-on-surface-variant/50 tracking-widest uppercase mt-0.5">
          Shigley 9ª · Norton 4ª
        </p>
      </button>
    </div>

    {/* Nav */}
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar" aria-label="Módulos">
      <p className="px-3 pb-2 text-[9px] font-mono uppercase tracking-widest text-on-surface-variant/40">
        Calculadoras
      </p>
      {TABS.map(t => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-left transition-all duration-200',
              active
                ? 'text-primary font-bold border-r-2 border-primary bg-surface-container-high'
                : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface',
            ].join(' ')}
          >
            <span className="text-base w-6 text-center select-none">{t.emoji}</span>
            <div>
              <div className="font-sans text-[12px] font-semibold leading-tight">{t.label}</div>
              <div className="font-mono text-[9px] text-on-surface-variant/50 leading-tight mt-0.5">{t.ref}</div>
            </div>
          </button>
        );
      })}
    </nav>

    {/* Bottom */}
    <div className="p-3 border-t border-outline-variant space-y-0.5">
      <button
        onClick={onOpenManual}
        className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-sm transition-all"
      >
        <span className="text-sm">📖</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">Manual de uso</span>
      </button>
      <button
        onClick={onGoHome}
        className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-sm transition-all"
      >
        <span className="text-sm">🏠</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">Inicio</span>
      </button>
    </div>
  </aside>
);

// ── Top bar ───────────────────────────────────────────────────────────────────
interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onGoHome: () => void;
  isImperial: boolean;
  onSetSI: () => void;
  onSetImperial: () => void;
}
const TopBar: React.FC<TopBarProps> = ({
  activeTab, onTabChange, onGoHome, isImperial, onSetSI, onSetImperial
}) => {
  const cfg = TABS.find(t => t.id === activeTab)!;
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-16rem)] h-14 bg-surface-container-low border-b border-outline-variant flex items-center justify-between px-4 lg:px-6 z-40">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile back */}
        <button
          onClick={onGoHome}
          className="lg:hidden text-on-surface-variant hover:text-primary transition-colors shrink-0"
          aria-label="Inicio"
        >
          ←
        </button>
        <span className="font-sans text-sm font-bold text-primary truncate">{cfg.label}</span>
        <span className="hidden sm:inline font-mono text-[10px] text-on-surface-variant/60 shrink-0">{cfg.ref}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile tab pills */}
        <div className="flex lg:hidden gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              title={t.label}
              className={[
                'px-2 py-1 rounded text-[10px] font-mono font-bold transition-all',
                activeTab === t.id
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-variant',
              ].join(' ')}
            >
              {t.shortLabel}
            </button>
          ))}
        </div>

        {/* Unit toggle */}
        <div className="flex rounded overflow-hidden border border-outline-variant text-[11px] font-mono">
          <button
            onClick={onSetSI}
            className={['px-2.5 py-1 font-bold transition-all', !isImperial ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-variant'].join(' ')}
          >SI</button>
          <button
            onClick={onSetImperial}
            className={['px-2.5 py-1 font-bold transition-all border-l border-outline-variant', isImperial ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-variant'].join(' ')}
          >Imperial</button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          className="w-8 h-8 flex items-center justify-center rounded transition-all text-on-surface-variant hover:text-primary hover:bg-surface-variant text-base"
          aria-label="Cambiar tema"
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Solver status */}
        <div className="hidden md:flex items-center gap-1.5 font-mono text-[9px] text-primary/60">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          SOLVER ACTIVO
        </div>
      </div>
    </header>
  );
};

// ── Main app ─────────────────────────────────────────────────────────────────
const AppInner: React.FC = () => {
  const [view, setView] = useState<'home' | 'calculator'>('home');
  const [manualOpen, setManualOpen] = useState(false);
  const { state, setActiveTab, setUnitSystem } = useCalculator();
  const isImperial = state.unitSystem === 'imperial';

  const handleEnter = (tab: ActiveTab) => {
    setActiveTab(tab);
    setView('calculator');
  };

  if (view === 'home') {
    return (
      <>
        <LandingPage onEnter={handleEnter} onOpenManual={() => setManualOpen(true)} />
        <UserManual open={manualOpen} onClose={() => setManualOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface technical-grid animate-fade-in-up"
         style={{ animationDuration: '0.35s' }}>

      <UserManual open={manualOpen} onClose={() => setManualOpen(false)} />

      <Sidebar
        activeTab={state.activeTab}
        onTabChange={setActiveTab}
        onGoHome={() => setView('home')}
        onOpenManual={() => setManualOpen(true)}
      />

      {/* ── Content area ── */}
      <div className="flex flex-col flex-1 lg:ml-64 min-w-0">

        <TopBar
          activeTab={state.activeTab}
          onTabChange={setActiveTab}
          onGoHome={() => setView('home')}
          isImperial={isImperial}
          onSetSI={() => setUnitSystem('SI')}
          onSetImperial={() => setUnitSystem('imperial')}
        />

        {/* Two-column workspace */}
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
