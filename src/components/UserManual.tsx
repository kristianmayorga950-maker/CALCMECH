import React, { useEffect } from 'react';

interface UserManualProps {
  open: boolean;
  onClose: () => void;
}

const Section: React.FC<{ n: string; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <section className="mb-6">
    <h3 className="text-base font-bold mb-2" style={{ color: 'var(--c-primary)' }}>
      {n}. {title}
    </h3>
    <div className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--c-text-muted)' }}>
      {children}
    </div>
  </section>
);

const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="ml-4 list-disc">{children}</li>
);

/**
 * Manual de uso integrado — se abre como modal sobre la app.
 * El contenido refleja docs/MANUAL_DE_USO.md.
 */
export const UserManual: React.FC<UserManualProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

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
              Calculadora de tornillos y juntas atornilladas · Shigley 9.ª ed.
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

        {/* Body */}
        <div className="px-6 py-5">
          <Section n="1" title="¿Qué es CALCMECH?">
            <p>Automatiza tres tipos de cálculo de elementos de sujeción. Todo se ejecuta en tu navegador (no se envía nada a un servidor).</p>
            <ul className="space-y-1">
              <Li><strong>Tornillo de potencia</strong> (§8-1, §8-2): torques, eficiencia, autobloqueo, Von Mises y esfuerzos del filete.</Li>
              <Li><strong>Junta a tensión</strong> (§8-3 a §8-11): rigideces, constante C, precarga, factores de seguridad, par de apriete, fatiga y empaques.</Li>
              <Li><strong>Junta a cortante</strong> (§8-12): cortante directo y excéntrico, aplastamiento y tensión en área neta.</Li>
            </ul>
          </Section>

          <Section n="2" title="Cómo empezar">
            <ol className="space-y-1 ml-4 list-decimal">
              <li>En la pantalla de inicio, elige una de las tres calculadoras.</li>
              <li>Llena los <strong>datos de entrada</strong> (columna izquierda).</li>
              <li>Presiona <strong>⚡ CALCULAR</strong>; los resultados aparecen a la derecha.</li>
              <li>Usa el menú lateral para cambiar de calculadora o volver al inicio.</li>
            </ol>
          </Section>

          <Section n="3" title="Controles generales">
            <ul className="space-y-1">
              <Li><strong>Unidades (SI / Imperial):</strong> botón en la barra superior; convierte todo automáticamente.</Li>
              <Li><strong>Tema claro / oscuro:</strong> botón ☀️ / 🌙 arriba a la derecha.</Li>
              <Li><strong>Secciones plegables:</strong> contrae o expande cada bloque con el chevron ▾.</Li>
              <Li><strong>Avisos:</strong> si falta un dato, un aviso flotante indica cuál.</Li>
              <Li><strong>Tooltips ⓘ:</strong> muestran la fórmula o nota al pasar el cursor.</Li>
            </ul>
          </Section>

          <Section n="4" title="Modo Manual vs. Diseño automático">
            <p>Tornillo de potencia y Junta a cortante incluyen un selector arriba del formulario:</p>
            <ul className="space-y-1">
              <Li><strong>Cálculo manual:</strong> evalúa un caso concreto (una cuerda y un material que tú eliges).</Li>
              <Li><strong>Diseño automático:</strong> barre muchas combinaciones (cuerda × material o perno × grado) y <strong>recomienda el tamaño más pequeño</strong> que cumple tu factor de seguridad objetivo, mostrando la tabla completa de candidatos.</Li>
            </ul>
          </Section>

          <Section n="5" title="Tornillo de potencia">
            <p><strong>Entradas:</strong> geometría de la rosca (Acme/cuadrada, entradas, diámetro, paso), carga axial, fricción y collarín, y material opcional (Sy).</p>
            <p><strong>Resultados:</strong> diámetros, avance, torques TR/TL/Tc, eficiencia, autobloqueo, Von Mises y esfuerzos del filete.</p>
          </Section>

          <Section n="6" title="Junta a tensión">
            <p><strong>Entradas:</strong> geometría del perno, grado/clase, longitud de agarre, rigidez del paquete (Cornwell o Wileman), precarga y apriete, carga externa (estática o fatiga) y empaque opcional.</p>
            <p style={{ color: 'var(--c-text)' }}>
              ⚠ Elige primero el <strong>Sistema</strong> (ISO o SAE) y luego la <strong>Clase/Grado</strong>. Si cambias de sistema, vuelve a seleccionar la clase.
            </p>
            <p><strong>Resultados:</strong> rigideces, constante C, precarga, factores np/n0/ny (y nf en fatiga), par de apriete y resultados del empaque.</p>
          </Section>

          <Section n="7" title="Junta a cortante">
            <p><strong>Entradas:</strong> patrón de pernos (coordenadas), datos del perno (diámetro, área, cortante simple/doble, grado), carga V y su punto de aplicación, y propiedades de la placa.</p>
            <p><strong>Resultados:</strong> centroide, momento, perno más cargado, factores por cortante/aplastamiento/área neta y criterio gobernante.</p>
          </Section>

          <Section n="8" title="Cómo leer los resultados">
            <ul className="space-y-1">
              <Li><strong>Veredicto:</strong> factor de seguridad gobernante y validez del diseño.</Li>
              <Li><strong>Parámetros confirmados:</strong> los valores realmente usados.</Li>
              <Li><strong>Desarrollo de cálculos:</strong> cada parámetro con su fórmula y valor.</Li>
              <Li><strong>Tabla de diseño iterativo:</strong> candidatos ordenados; el recomendado va con ★.</Li>
              <Li><strong>Dashboard y PDF:</strong> gráficos interactivos y exportación a PDF.</Li>
            </ul>
          </Section>

          <Section n="9" title="Consejos">
            <ul className="space-y-1">
              <Li>Usa <strong>punto (.)</strong> como separador decimal, no coma.</Li>
              <Li>En modo automático, el <strong>factor de seguridad objetivo</strong> define la recomendación.</Li>
              <Li>Las advertencias (p. ej. "no autobloqueante") son informativas; no detienen el cálculo.</Li>
            </ul>
          </Section>

          <Section n="10" title="Referencias">
            <ol className="space-y-1 ml-4 list-decimal">
              <li>Budynas, R. G. &amp; Nisbett, J. K. <em>Diseño en Ingeniería Mecánica de Shigley</em>, 9.ª ed. McGraw-Hill, 2012. — §8.</li>
              <li>Norton, R. L. <em>Diseño de Máquinas: Un Enfoque Integrado</em>, 4.ª ed. Pearson, 2011. — §11, §11.8.</li>
              <li>Mott, R. L. <em>Diseño de Elementos de Máquinas</em>, 4.ª ed. Pearson. — Unidades y esfuerzos admisibles.</li>
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
};
