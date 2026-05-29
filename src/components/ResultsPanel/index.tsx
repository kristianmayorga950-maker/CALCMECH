import React from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import { ParametersSection }  from './ParametersSection';
import { CalculationsSection } from './CalculationsSection';
import { VerdictBox }         from './VerdictBox';
import { AlternativesTable }  from './AlternativesTable';
import { GasketResultsSection } from './GasketResultsSection';
import { DesignSweepTable }    from './DesignSweepTable';
import { DesignDashboard }    from './DesignDashboard';
import { ScrollReveal }       from '@/components/common/ScrollReveal';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--c-text-dim)' }}>
    <span className="text-6xl mb-4 animate-float select-none">🔩</span>
    <p className="text-base font-medium" style={{ color: 'var(--c-text-muted)' }}>Ingrese los parámetros y presione CALCULAR</p>
    <p className="text-sm mt-1" style={{ color: 'var(--c-text-dim)' }}>Los resultados aparecerán aquí</p>
  </div>
);

const UnitToggle: React.FC = () => {
  const { state, setUnitSystem } = useCalculator();
  return (
    <div className="flex items-center justify-end gap-2 mb-1">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--c-text-dim)' }}>Unidades</span>
      <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        {(['SI', 'imperial'] as const).map((sys, i) => (
          <button
            key={sys}
            onClick={() => setUnitSystem(sys)}
            style={state.unitSystem === sys
              ? { backgroundColor: 'var(--c-primary)', color: 'var(--c-on-primary)' }
              : { backgroundColor: 'var(--c-surface)', color: 'var(--c-text-muted)' }
            }
            className={[
              'px-3 py-1 text-xs font-semibold transition-all duration-200',
              i === 1 ? '' : '',
            ].join(' ')}
          >
            {sys === 'imperial' ? 'Imperial' : sys}
          </button>
        ))}
      </div>
    </div>
  );
};

export const ResultsPanel: React.FC = () => {
  const { state } = useCalculator();
  const tab = state.activeTab;

  // ── Modo "Diseño automático" (barrido iterativo) ──
  const isAuto = (tab === 'power' && state.autoMode.power) || (tab === 'shear' && state.autoMode.shear);
  if (isAuto) {
    const sweep = tab === 'power' ? state.powerSweep : state.shearSweep;
    if (!sweep) return <EmptyState />;
    return (
      <div className="space-y-3">
        <UnitToggle />
        <ScrollReveal delay={0}>
          <div className="card">
            <h3 className="section-title">Tabla de diseño iterativo</h3>
            <DesignSweepTable sweep={sweep} moduleType={tab as 'power' | 'shear'} />
          </div>
        </ScrollReveal>
      </div>
    );
  }

  const results =
    tab === 'power'   ? state.powerResults   :
    tab === 'tension' ? state.tensionResults :
    state.shearResults;

  if (!results) return <EmptyState />;

  return (
    <div className="space-y-3">
      <UnitToggle />
      <ScrollReveal delay={0}>
        <VerdictBox results={results} moduleType={tab} unitSystem={state.unitSystem} />
      </ScrollReveal>

      {/* Dos columnas: Parámetros confirmados | Cálculos + fórmulas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScrollReveal delay={80}>
          <ParametersSection results={results} unitSystem={state.unitSystem} moduleType={tab} />
        </ScrollReveal>
        <ScrollReveal delay={160}>
          <CalculationsSection results={results} unitSystem={state.unitSystem} moduleType={tab} />
        </ScrollReveal>

        {tab === 'tension' && (results as any).gasket && (
          <ScrollReveal delay={220}>
            <CollapsibleSection title="Unión con empaque" defaultOpen={false}>
              <GasketResultsSection results={results as any} unitSystem={state.unitSystem} />
            </CollapsibleSection>
          </ScrollReveal>
        )}
        {tab === 'power' && (
          <ScrollReveal delay={240}>
            <CollapsibleSection title="Alternativas de diseño" defaultOpen={false}>
              <AlternativesTable results={results} moduleType={tab} />
            </CollapsibleSection>
          </ScrollReveal>
        )}
      </div>

      {/* Dashboard interactivo — ancho completo */}
      <ScrollReveal delay={320}>
        <CollapsibleSection title="Dashboard — Gráficos interactivos" defaultOpen={false}>
          <DesignDashboard results={results} moduleType={tab} unitSystem={state.unitSystem} />
        </CollapsibleSection>
      </ScrollReveal>
    </div>
  );
};
