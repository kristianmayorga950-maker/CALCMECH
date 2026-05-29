import React, { useMemo } from 'react';

// KaTeX se carga desde CDN en index.html; usamos la variable global
declare const katex: {
  renderToString: (tex: string, opts?: object) => string;
};

const formulaCache = new Map<string, string>();

function renderFormula(latex: string): string {
  if (!formulaCache.has(latex)) {
    try {
      const html = typeof katex !== 'undefined'
        ? katex.renderToString(latex, { throwOnError: false, displayMode: false })
        : `<code>${latex}</code>`;
      formulaCache.set(latex, html);
    } catch {
      formulaCache.set(latex, `<code>${latex}</code>`);
    }
  }
  return formulaCache.get(latex)!;
}

interface FormulaDisplayProps {
  latex:    string;
  className?: string;
}

export const FormulaDisplay: React.FC<FormulaDisplayProps> = ({ latex, className }) => {
  const html = useMemo(() => renderFormula(latex), [latex]);
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
