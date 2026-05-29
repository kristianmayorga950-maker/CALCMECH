import React from 'react';

interface Props { results: any; moduleType: 'power' | 'tension' | 'shear'; }

function toCSV(results: any): string {
  const calcs = results.calculations ?? {};
  const lines = ['Parametro,Valor,Unidad,Ref'];
  for (const [key, entry] of Object.entries(calcs) as any) {
    lines.push(`${key},${entry.value},${entry.unit},${entry.ref ?? ''}`);
  }
  if (results.verdict) {
    lines.push(`verdict,${results.verdict.verdict},,`);
    lines.push(`safetyFactor,${results.verdict.safetyFactor},,`);
  }
  return lines.join('\n');
}

export const ExportButtons: React.FC<Props> = ({ results, moduleType }) => {
  const handleCSV = () => {
    const csv  = toCSV(results);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `tornillo_${moduleType}_resultados.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `tornillo_${moduleType}_resultados.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2 mt-2 mb-4">
      <button onClick={handleCSV}  className="btn-secondary flex-1">⬇ CSV</button>
      <button onClick={handleJSON} className="btn-secondary flex-1">⬇ JSON</button>
    </div>
  );
};
