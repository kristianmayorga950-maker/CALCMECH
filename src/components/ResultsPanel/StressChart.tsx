import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  results:    any;
  moduleType: 'power' | 'tension' | 'shear';
}

export const StressChart: React.FC<Props> = ({ results, moduleType }) => {
  let data: { name: string; actual: number; admisible: number }[] = [];

  if (moduleType === 'power') {
    const b = results.bodyStress;
    const th = results.threadStress;
    const allow = b.allowableSy ?? Math.max(b.sigmaVonMises, 1);
    data = [
      { name: 'σ axial',     actual: +b.sigmaAxial.toFixed(2),    admisible: +allow.toFixed(2) },
      { name: 'τ torsión',   actual: +b.tauTorsion.toFixed(2),    admisible: +(allow / Math.sqrt(3)).toFixed(2) },
      { name: 'Von Mises',   actual: +b.sigmaVonMises.toFixed(2), admisible: +allow.toFixed(2) },
      { name: 'σ aplast.',   actual: +th.bearing.toFixed(2),      admisible: +allow.toFixed(2) },
      { name: 'σ flex. filete', actual: +th.bending.toFixed(2),   admisible: +allow.toFixed(2) },
    ];
  } else if (moduleType === 'tension') {
    const s = results.staticLoad;
    data = [
      { name: 'np (carga)',     actual: +s.np.toFixed(2), admisible: 2.0 },
      { name: 'n0 (separación)',actual: +s.n0.toFixed(2), admisible: 1.5 },
    ];
    if (results.fatigue) {
      data.push({ name: 'nf (fatiga)', actual: +results.fatigue.nf.toFixed(2), admisible: 2.0 });
    }
  } else if (moduleType === 'shear') {
    data = [
      { name: 'n cortante',    actual: +(results.nBoltShear ?? 0).toFixed(2), admisible: 2.0 },
      { name: 'n aplastamiento', actual: +(results.nBearing ?? 0).toFixed(2), admisible: 2.0 },
    ];
    if (results.nNet != null) {
      data.push({ name: 'n área neta', actual: +results.nNet.toFixed(2), admisible: 2.0 });
    }
  }

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    color: '#212121',
    fontSize: 12,
  };

  return (
    <div className="card">
      <h3 className="section-title">Comparativa de esfuerzos / factores de seguridad</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#212121' }} axisLine={{ stroke: '#bdbdbd' }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#212121' }} axisLine={{ stroke: '#bdbdbd' }} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ff980018' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#212121' }} />
          <Bar dataKey="actual"    name="Real / actual"   fill="#ff9800" radius={[3,3,0,0]} />
          <Bar dataKey="admisible" name="Admisible / mín" fill="#212121" fillOpacity={0.35} stroke="#212121" strokeWidth={1} radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
