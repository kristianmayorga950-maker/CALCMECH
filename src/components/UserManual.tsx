import React, { useEffect } from 'react';
import { BookOpen, FileText, X } from 'lucide-react';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';

interface UserManualProps {
  open: boolean;
  onClose: () => void;
}

const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="ml-4 list-disc">{children}</li>
);

/** Bloque "qué meter / qué obtienes / consejo" reutilizable dentro de cada apartado. */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <p>
    <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{label}: </span>
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="um-title"
        className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-lg shadow-2xl custom-scrollbar"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
        >
          <div className="min-w-0">
            <h2 id="um-title" className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
              <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" /> Manual de uso · CALCMECH
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--c-text-dim)' }}>
              Toca cada apartado para abrirlo.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <a
                href={`${import.meta.env.BASE_URL}Manual_de_Usuario_CALCMECH.pdf`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors"
                style={{ background: 'var(--c-primary)', color: 'var(--c-on-primary)' }}
              >
                <FileText size={13} strokeWidth={1.75} aria-hidden="true" /> Manual completo (PDF)
              </a>
              <a
                href={`${import.meta.env.BASE_URL}Capacidades_CALCMECH.pdf`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors"
                style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}
              >
                <FileText size={13} strokeWidth={1.75} aria-hidden="true" /> Capacidades (PDF)
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar manual"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md transition-colors self-start"
            style={{ color: 'var(--c-text-muted)' }}
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Cuerpo — cada apartado es retráctil */}
        <div className="px-4 sm:px-6 py-5 space-y-2">

          <CollapsibleSection title="1. ¿Qué es CALCMECH?" defaultOpen>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <p>Tres calculadoras de elementos roscados que muestran el procedimiento completo: ecuación, sustitución y resultado. Todo corre en tu navegador; nada se envía a un servidor.</p>
              <ul className="space-y-1">
                <Li><strong>1 · Tornillo de potencia</strong>: pares, eficiencia, autobloqueo, esfuerzos, pandeo y desgaste.</Li>
                <Li><strong>2 · Pernos a tensión</strong>: rigideces, precarga, fatiga y par de apriete.</Li>
                <Li><strong>3 · Pernos a cortante</strong>: grupos de pernos con carga excéntrica.</Li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="2. La portada" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <p>La portada es un plano de conjunto de un gato de tornillo. Cada pieza numerada es una calculadora.</p>
              <ul className="space-y-1">
                <Li>Entra tocando la pieza en el dibujo, su globo o su fila en la lista de piezas. Con el teclado: Tab hasta la pieza y Enter.</Li>
                <Li><strong>Continuar</strong> abre lo último que hiciste en el tornillo de potencia, tal como lo dejaste.</Li>
                <Li><strong>Proyectos guardados</strong> muestra cada proyecto con su mecanismo dibujado, el veredicto, el criterio que gobierna y los valores de F y d.</Li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="3. Controles generales" defaultOpen={false}>
            <div className="text-sm leading-relaxed" style={txt}>
              <ul className="space-y-1">
                <Li><strong>Cajetín (barra superior):</strong> calculadora abierta, unidades SI / Imperial y tema claro / oscuro.</Li>
                <Li><strong>Lista de piezas (barra lateral):</strong> cambia de calculadora; el botón de arriba la oculta para ganar espacio.</Li>
                <Li><strong>Portada:</strong> abajo en la barra lateral, o la flecha del cajetín en el celular.</Li>
                <Li>Usa <strong>punto (.)</strong> como separador decimal.</Li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="4. Tornillo de potencia: cómo se trabaja" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field label="Configura el sistema">transmisión (par directo, palanca o reductor), accionamiento manual o con velocidad, rosca cuadrada o Acme, apoyo de empuje (ninguno, collarín o rodamiento), par en el cuerpo, sentido de la carga y objetivo.</Field>
              <Field label="Cálculo progresivo">no hay botón de calcular ni campos obligatorios. Cada dato que escribes desbloquea los pasos que dependen de él, y la app indica el <strong>próximo dato útil</strong> y lo que falta en cada etapa.</Field>
              <Field label="Tablas">los datos se pueden tomar de las tablas (tamaños Acme, materiales, fricción de rosca y de collarín, condición de extremos); el valor queda marcado con su origen.</Field>
              <Field label="Objetivo">Analizar, Capacidad (carga que se puede mover), Accionamiento (par o fuerza a aplicar), Dimensionar (diámetro necesario) o Avance. Solo cambia lo que se resalta.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="5. Tornillo de potencia: qué obtienes" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field label="Esquema del sistema">dibujo del mecanismo elegido, con las cotas que ya tienen valor; las punteadas esperan su dato. «Ver en grande» lo amplía.</Field>
              <Field label="Cálculo paso a paso">cada resultado con su ecuación, los valores usados, la sustitución y el resultado con unidades, agrupado por etapas.</Field>
              <Field label="Estado del diseño">verificaciones que aplican a tu caso (autobloqueo, retención, fluencia en la raíz y en el cuerpo, pandeo, desgaste, entrada suficiente), con el porcentaje de utilización y el criterio que gobierna.</Field>
              <Field label="Gráficos">reparto del par, eficiencia según el ángulo de avance, utilización por criterio y carga por filete. Cada uno tiene un «Qué significa» plegado.</Field>
              <Field label="Dimensionar">recorre el catálogo Acme y propone el menor tamaño que cumple; puedes aplicarlo con un clic.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="6. Tornillo de potencia: proyectos y autoguardado" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field label="Menú Proyecto">cargar los dos ejemplos resueltos, guardar (o guardar una copia), abrir un guardado con su miniatura, exportar el proyecto (.json) o un informe (.md), importar un proyecto y reiniciar.</Field>
              <Field label="Autoguardado">lo que tienes en pantalla se guarda solo. Si sales a la portada o recargas la página, se recupera al volver. «Reiniciar» lo borra; tus proyectos guardados no se tocan.</Field>
              <Field label="Consejo">los proyectos viven en este navegador. Para llevarlos a otro equipo, exporta el .json e impórtalo allá.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="7. Pernos a tensión" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field label="Qué meter">perno, grado o clase, agarre, rigidez (Cornwell o Wileman), precarga y carga (estática o fatiga).</Field>
              <Field label="Qué obtienes">rigideces, constante C, precarga, factores np, n0, ny (y nf en fatiga) y par de apriete.</Field>
              <Field label="Consejo">elige primero el sistema (ISO o SAE) y luego la clase. Si cambias de sistema, vuelve a elegir la clase. Presiona <strong>Calcular</strong> para ver los resultados.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="8. Pernos a cortante" defaultOpen={false}>
            <div className="text-sm leading-relaxed space-y-1.5" style={txt}>
              <Field label="Qué meter">patrón de pernos, datos del perno, carga V y su punto de aplicación, y la placa.</Field>
              <Field label="Qué obtienes">centroide, momento, perno más cargado y factores por cortante, aplastamiento y área neta.</Field>
              <Field label="Diseño automático">recorre tamaños de perno y grados, y recomienda el menor que cumple el factor objetivo (marcado con estrella).</Field>
              <Field label="Consejo">centra el patrón sobre la línea de acción de V para anular el momento.</Field>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="9. Cómo leer los resultados de las juntas" defaultOpen={false}>
            <div className="text-sm leading-relaxed" style={txt}>
              <ul className="space-y-1">
                <Li><strong>Veredicto:</strong> factor que gobierna y si el diseño es válido, marginal o inválido.</Li>
                <Li><strong>Desarrollo de cálculos:</strong> fórmula y valor de cada parámetro.</Li>
                <Li><strong>Dashboard y PDF:</strong> gráficos y exportación.</Li>
                <Li>Las advertencias informan; no detienen el cálculo.</Li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="10. Referencias" defaultOpen={false}>
            <div className="text-sm leading-relaxed" style={txt}>
              <ol className="space-y-1 ml-4 list-decimal">
                <li>Budynas y Nisbett. <em>Diseño en Ingeniería Mecánica de Shigley</em>, 9.ª ed. Capítulo 8.</li>
                <li>Norton. <em>Diseño de Máquinas</em>, 4.ª ed. Capítulo 11.</li>
                <li>Mott. <em>Diseño de Elementos de Máquinas</em>, 4.ª ed. Unidades y esfuerzos admisibles.</li>
              </ol>
            </div>
          </CollapsibleSection>

        </div>
      </div>
    </div>
  );
};
