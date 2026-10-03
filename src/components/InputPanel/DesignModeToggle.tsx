import React from 'react';
import { useCalculator } from '@/context/CalculatorContext';

/**
 * Conmuta entre cálculo manual de un caso y diseño automático (barrido iterativo).
 * Solo la junta a cortante tiene modo automático.
 */
export const DesignModeToggle: React.FC<{ tab: 'shear' }> = ({ tab }) => {
  const { state, setAutoMode } = useCalculator();
  const auto = state.autoMode[tab];

  const opts: Array<{ on: boolean; label: string }> = [
    { on: false, label: 'Cálculo manual' },
    { on: true,  label: 'Diseño automático' },
  ];

  return (
    <div className="card lg:col-span-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>Modo de cálculo</p>
          <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
            {auto
              ? 'Barre pernos y grados y recomienda el menor tamaño que cumple el factor objetivo.'
              : 'Evalúa un solo caso con el perno y el grado que ingreses.'}
          </p>
        </div>
        <div className="flex rounded-md overflow-hidden shrink-0" style={{ border: '1px solid var(--c-border)' }}>
          {opts.map(o => (
            <button
              key={String(o.on)}
              onClick={() => setAutoMode(tab, o.on)}
              className="px-3 py-1.5 text-xs font-semibold transition-all duration-200"
              style={auto === o.on
                ? { backgroundColor: 'var(--c-primary)', color: 'var(--c-on-primary)' }
                : { backgroundColor: 'var(--c-surface)', color: 'var(--c-text-muted)' }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
