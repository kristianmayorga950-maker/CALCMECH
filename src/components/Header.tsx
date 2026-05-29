import React from 'react';
import { useCalculator } from '@/context/CalculatorContext';

interface HeaderProps {
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onGoHome }) => {
  const { state, setUnitSystem } = useCalculator();
  const isImperial = state.unitSystem === 'imperial';

  return (
    <header className="relative overflow-hidden border-b border-material-border"
            style={{ background: 'linear-gradient(160deg, #212121 0%, #1a1a1a 60%, #111111 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-25"
             style={{ background: 'radial-gradient(circle, #ff9800 0%, transparent 70%)' }} />
        <div className="absolute -top-16 right-12 w-72 h-72 rounded-full blur-3xl opacity-20"
             style={{ background: 'radial-gradient(circle, #ffb74d 0%, transparent 70%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.05]"
             style={{
               backgroundImage: 'linear-gradient(#ff9800 1px, transparent 1px), linear-gradient(90deg, #ff9800 1px, transparent 1px)',
               backgroundSize: '40px 40px',
             }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-3 pt-2.5 pb-2">

        {/* Top row: back button + title + global unit toggle */}
        <div className="flex items-center gap-3 animate-fade-in-left">
          <button onClick={onGoHome} className="btn-back">
            ← Inicio
          </button>
          <div className="w-px h-6 bg-white/20" />
          <div className="flex-1 min-w-0">
            <h1 className="font-title text-lg sm:text-xl font-bold text-white leading-tight tracking-tight">
              Calculadora de{' '}
              <span className="text-orange-400"
                    style={{ textShadow: '0 0 24px #ff980060' }}>
                Tornillos
              </span>
            </h1>
            <p className="text-white/60 text-[11px] leading-tight">
              Shigley &mdash; <em>Diseño en Ingeniería Mecánica, 9ª Ed.</em> — Cap. 8
            </p>
          </div>

          {/* Global unit system toggle (afecta todas las pestañas) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/60 hidden sm:inline">Unidades:</span>
            <div className="flex rounded-md overflow-hidden border border-white/20 shadow">
              <button
                type="button"
                onClick={() => setUnitSystem('SI')}
                className={[
                  'px-2.5 py-1 text-xs font-semibold transition-all',
                  !isImperial
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/15',
                ].join(' ')}
                title="Sistema Internacional (mm, N, MPa)"
              >
                SI
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem('imperial')}
                className={[
                  'px-2.5 py-1 text-xs font-semibold transition-all border-l border-white/20',
                  isImperial
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/15',
                ].join(' ')}
                title="Sistema inglés (in, lbf, kpsi)"
              >
                Imperial
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
