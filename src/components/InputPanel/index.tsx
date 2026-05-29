import React, { useEffect, useRef, useState } from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import { PowerScrewInputForm }   from './PowerScrewInputForm';
import { TensionJointInputForm } from './TensionJointInputForm';
import { ShearJointInputForm }   from './ShearJointInputForm';

/** Strip academic source references from error messages.
 *  "Faltan datos (Norton §11/Shigley §8-4/§8-9): Carga P" → "Faltan datos: Carga P"
 */
const cleanError = (msg: string): string =>
  msg
    .replace(/\s*\((?:Norton[^)]*|Shigley[^)]*)\)/gi, '')
    .replace(/Norton\s+§[\d.-]+[^,:)]*[,/]?\s*/gi, '')
    .replace(/Shigley\s+§[\d.-]+[^,:)]*[,/]?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const ErrorBanner: React.FC<{ error: string; onDismiss: () => void }> = ({ error, onDismiss }) => (
  <div
    className="sticky top-0 z-20 mb-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-medium animate-fade-in-down"
    style={{
      background: 'var(--c-invalid-bg)',
      border: '1px solid var(--c-invalid-bdr)',
      color: 'var(--c-invalid-txt)',
    }}
  >
    <span className="shrink-0 mt-0.5">⚠</span>
    <span className="flex-1 leading-snug">{cleanError(error)}</span>
    <button
      onClick={onDismiss}
      className="shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
      aria-label="Cerrar"
    >
      ✕
    </button>
  </div>
);

export const InputPanel: React.FC = () => {
  const { state } = useCalculator();
  const ref = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);

  /* Reset dismissed state when a new error arrives or the tab changes */
  const prevError = useRef<string | null>(null);
  useEffect(() => {
    if (state.error !== prevError.current) {
      prevError.current = state.error ?? null;
      setDismissed(false);
    }
  }, [state.error, state.activeTab]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
    return () => cancelAnimationFrame(id);
  }, [state.activeTab]);

  return (
    <div ref={ref}>
      {state.error && !dismissed && (
        <ErrorBanner error={state.error} onDismiss={() => setDismissed(true)} />
      )}
      {state.activeTab === 'power'   && <PowerScrewInputForm />}
      {state.activeTab === 'tension' && <TensionJointInputForm />}
      {state.activeTab === 'shear'   && <ShearJointInputForm />}
    </div>
  );
};
