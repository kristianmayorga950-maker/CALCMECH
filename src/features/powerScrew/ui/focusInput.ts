import type { InputId } from '../engine/types';

/** Lleva el foco al campo de un dato y lo resalta un instante. */
export function focusInput(id: InputId): void {
  const el = document.getElementById('ps-in-' + id) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.focus({ preventScroll: true });
  const row = el.closest('.ps-field');
  if (row) {
    row.classList.add('ps-flash');
    window.setTimeout(() => row.classList.remove('ps-flash'), 1400);
  }
}
