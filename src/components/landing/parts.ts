import type { ActiveTab } from '@/context/CalculatorContext';

/** Piezas del plano de conjunto: cada una es una calculadora (portada y barra lateral). */
export const PARTS: { no: 1 | 2 | 3; id: ActiveTab; name: string; desc: string }[] = [
  { no: 1, id: 'power',   name: 'Tornillo de potencia', desc: 'Pares de subir y bajar, eficiencia, autobloqueo, esfuerzos, pandeo y desgaste de la tuerca.' },
  { no: 2, id: 'tension', name: 'Pernos a tensión',     desc: 'Unión de la base: rigideces, precarga, fatiga y par de apriete.' },
  { no: 3, id: 'shear',   name: 'Pernos a cortante',    desc: 'Ménsula guía: grupo de pernos con carga excéntrica, aplastamiento y área neta.' },
];

export const partOfTab = (tab: ActiveTab) => PARTS.find(p => p.id === tab)!;
