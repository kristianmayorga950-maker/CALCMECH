import { memo, useMemo } from 'react';
import katex from 'katex';

interface TexProps {
  tex: string;
  display?: boolean;
  className?: string;
}

/** Renderiza LaTeX con KaTeX (el CSS de KaTeX se carga globalmente en index.html). */
export const Tex = memo(function Tex({ tex, display = false, className }: TexProps) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: display }),
    [tex, display],
  );
  const Tag = display ? 'div' : 'span';
  return <Tag className={className ?? (display ? 'ps-tex-block' : 'ps-tex')} dangerouslySetInnerHTML={{ __html: html }} />;
});

export default Tex;
