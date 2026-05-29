import React from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import type { ActiveTab } from '@/context/CalculatorContext';

const TABS: { id: ActiveTab; label: string; icon: string; desc: string }[] = [
  { id: 'power',   label: 'Tornillo de Potencia', icon: '⚙️', desc: 'Shigley §8-1, §8-2' },
  { id: 'tension', label: 'Junta a Tensión',      icon: '🔩', desc: 'Shigley §8-3 a §8-11' },
  { id: 'shear',   label: 'Junta a Cortante',     icon: '✂️', desc: 'Shigley §8-12' },
];

export const TabSelector: React.FC = () => {
  const { state, setActiveTab } = useCalculator();

  return (
    <div className="sticky top-0 z-20 border-b border-material-border bg-material-bg/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-3">
        <nav className="flex gap-1.5 py-1.5" aria-label="Módulos de cálculo">
          {TABS.map(tab => {
            const active = state.activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'relative flex-1 flex flex-col items-center px-2 py-1.5 rounded-lg text-sm',
                  'transition-all duration-300 group overflow-hidden',
                  active
                    ? 'bg-orange-500/10 border border-orange-500/60 text-orange-700 shadow-[0_0_18px_#ff980030]'
                    : 'border border-transparent text-slate-400 hover:bg-material-card hover:border-material-border hover:text-material-dark',
                ].join(' ')}
              >
                {/* Active glow overlay */}
                {active && (
                  <span className="absolute inset-0 bg-gradient-to-b from-orange-500/8 to-transparent pointer-events-none" />
                )}

                {/* Bottom indicator bar */}
                <span className={[
                  'absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full',
                  'transition-all duration-300',
                  active ? 'w-10 bg-orange-500 shadow-[0_0_8px_#ff9800]' : 'w-0 bg-orange-500',
                ].join(' ')} />

                <span className={`text-base transition-transform duration-300 ${!active ? 'group-hover:scale-110 group-hover:-translate-y-0.5' : ''}`}>
                  {tab.icon}
                </span>
                <span className={`font-title font-semibold text-xs mt-0 ${active ? 'text-orange-700' : ''}`}>
                  {tab.label}
                </span>
                <span className="text-[10px] text-slate-500 hidden lg:block leading-tight group-hover:text-slate-400 transition-colors">
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
