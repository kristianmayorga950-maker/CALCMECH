import type { InputId } from '../engine/types';
import { varLabel, varSymbol } from '../engine/vars';
import { focusInput } from './focusInput';
import Tex from './Tex';

/** Botón pequeño con el símbolo de un dato; al pulsarlo enfoca su campo. */
export function Chip({ id }: { id: InputId }) {
  return (
    <button type="button" className="ps-chip" onClick={() => focusInput(id)} title={`Ir a: ${varLabel(id)}`}>
      <Tex tex={varSymbol(id)} />
    </button>
  );
}
