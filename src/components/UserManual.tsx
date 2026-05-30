import React, { useEffect } from 'react';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';

interface UserManualProps {
  open: boolean;
  onClose: () => void;
}

const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="ml-4 list-disc">{children}</li>
);

/** Bloque "qué meter / resultados / consejo" reutilizable dentro de cada apartado. */
const Field: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <p>
    <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{icon} {label}: </span>
    {children}
  </p>
);

/**
 * Manual de uso integrado — modal con cada indicación en una sección retráctil.
 * Versión resumida de docs/MANUAL_DE_USO.md (misma esencia).
 */
export const UserManual: React.FC<UserManualProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const txt = { color: 'var(--c-text-muted)' } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in-up"
      style={{ background: 'rgba(0,0,0,0.6)', animationDuration: '0.2s' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl shadow-2xl custom-scrollbar"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>
              📖 Manual de uso — CALCMECH
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--c-text-dim)' }}>
              Toca cada apartado para expandirlo · Shigley 9.ª ed.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar manual"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-lg transition-colors"
            style={{ color: 'var(--c-text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Body — cada apartado es retráctil */}
        <div className="px-4 sm:px-6 py-5 space-y-2">

          <CollapsibleSection title="1. ¿Qué es CALCMECH?" defaultOpen>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <p>Automatiza tres cálculos de sujetadores. Todo corre en tu navegador (nada se envía a un servidor).</p>
              <ul className="space-y-1">
                <Li><strong>Tornillo de potencia</strong> (§8-1, §8-2)</Li>
                <Li><strong>Junta a tensión</strong> (§8-3 a §8-11)</Li>
                <Li><strong>Junta a cortante</strong> (§8-12)</Li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="2. Cómo empezar" defaultOpen={false}>
            <div className="text-sm leading-relaxed" style={txt}>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Elige una calculadora en la pantalla de inicio.</li>
                <li>Llena los datos de entrada (izquierda).</li>
                <li>Presiona <strong>⚡ CALCULAR</strong>; los resultados salen a la derecha.</li>
              </ol>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="3. Controles generales" defaultOpen={false}>
            <div className="text-sm leading-relaxed" style={txt}>
              <ul className="space-y-1">
                <Li><strong>SI / Imperial:</strong> convierte todo automáticamente.</Li>
                <Li><strong>Tema ☀️ / 🌙</strong> y <strong>secciones plegables ▾</strong>.</Li>
                <Li><strong>Avisos flotantes</strong> indican qué dato falta.</Li>
                <Li><strong>Tooltips ⓘ</strong> muestran la fórmula.</Li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="4. Modo Manual vs. Diseño automático" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field icon="🔧" label="Manual">evalúa un caso (una cuerda y un material que tú eliges).</Field>
              <Field icon="⚙️" label="Automático">barre muchas combinaciones y recomienda el <strong>menor tamaño</strong> que cumple tu factor de seguridad objetivo.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="5. Tornillo de potencia" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field icon="📥" label="Qué meter">geometría de la rosca, carga axial, fricción/collarín y material opcional.</Field>
              <Field icon="📤" label="Resultados">torques TR/TL/Tc, eficiencia, autobloqueo, Von Mises y esfuerzos del filete.</Field>
              <Field icon="💡" label="Consejo">si la eficiencia es crítica, prefiere rosca cuadrada; revisa el autobloqueo.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="6. Junta a tensión" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field icon="📥" label="Qué meter">perno, grado/clase, agarre, rigidez (Cornwell/Wileman), precarga y carga (estática o fatiga).</Field>
              <Field icon="📤" label="Resultados">rigideces, constante C, precarga, factores np/n0/ny (y nf), par de apriete.</Field>
              <Field icon="💡" label="Consejo">elige primero el <strong>Sistema</strong> (ISO o SAE) y luego la <strong>Clase</strong>. Si cambias de sistema, reselecciona.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="7. Junta a cortante" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field icon="📥" label="Qué meter">patrón de pernos, datos del perno, carga V y su punto de aplicación, y la placa.</Field>
              <Field icon="📤" label="Resultados">centroide, momento, perno más cargado y factores por cortante/aplastamiento/área neta.</Field>
              <Field icon="💡" label="Consejo">centra el patrón sobre la línea de acción de V para anular el momento.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="8. Cómo leer los resultados" defaultOpen={false}>
            <div className="text-sm leading-relaxed" style={txt}>
              <ul className="space-y-1">
                <Li><strong>Veredicto:</strong> factor gobernante y validez.</Li>
                <Li><strong>Desarrollo de cálculos:</strong> fórmula y valor de cada parámetro.</Li>
                <Li><strong>Tabla iterativa:</strong> candidatos; el recomendado va con ★.</Li>
                <Li><strong>Dashboard y PDF:</strong> gráficos y exportación.</Li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="9. Consejos generales" defaultOpen={false}>
            <div className="text-sm leading-relaxed" style={txt}>
              <ul className="space-y-1">
                <Li>Usa <strong>punto (.)</strong> como separador decimal.</Li>
                <Li>En modo automático, el <strong>factor objetivo</strong> define la recomendación.</Li>
                <Li>Las advertencias son informativas; no detienen el cálculo.</Li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="10. Referencias" defaultOpen={false}>
            <div className="text-sm leading-relaxed" style={txt}>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Budynas &amp; Nisbett. <em>Diseño en Ingeniería Mecánica de Shigley</em>, 9.ª ed. — §8.</li>
                <li>Norton. <em>Diseño de Máquinas</em>, 4.ª ed. — §11, §11.8.</li>
                <li>Mott. <em>Diseño de Elementos de Máquinas</em>, 4.ª ed. — unidades y admisibles.</li>
              </ol>
            </div>
          </CollapsibleSection>

        </div>
      </div>
    </div>
  );
};
