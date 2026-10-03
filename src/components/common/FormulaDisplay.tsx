import React, { useMemo } from 'react';
import katex from 'katex';

const formulaCache = new Map<string, string>();

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderFormula(latex: string): string {
  if (!formulaCache.has(latex)) {
    try {
      formulaCache.set(latex, katex.renderToString(latex, { throwOnError: false, displayMode: false }));
    } catch {
      formulaCache.set(latex, `<code>${escapeHtml(latex)}</code>`);
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
