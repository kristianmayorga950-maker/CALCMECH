/** Interpretación plegada bajo un gráfico: una línea cerrada, una frase al abrirla. */
export default function Interpretation({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <details className="ps-interp">
      <summary>Qué significa</summary>
      <p>{text}</p>
    </details>
  );
}
