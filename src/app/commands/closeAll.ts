// minicode - comando: cerrar todos los tabs abiertos

import * as files from '../../state/files.js';

/**
 * Cierra todos los tabs.
 * Si hay archivos con cambios sin guardar, muestra UN confirm
 * global listando cuántos son.
 */
export function cerrarTodo(): void {
  const state = files.getState();
  if (state.files.length === 0) return;

  const conCambios = state.files.filter((f) => f.dirty);

  if (conCambios.length > 0) {
    const nombres = conCambios.slice(0, 5).map((f) => `• ${f.name}`).join('\n');
    const resto =
      conCambios.length > 5 ? `\n... y ${conCambios.length - 5} más` : '';

    const ok = window.confirm(
      `${conCambios.length} archivo(s) tienen cambios sin guardar:\n\n` +
        `${nombres}${resto}\n\n` +
        `¿Cerrar todo de todos modos?`
    );
    if (!ok) return;
  }

  // Cerrar todos los archivos uno a uno (el último cierra el estado vacío)
  const ids = state.files.map((f) => f.id);
  for (const id of ids) {
    files.cerrarArchivo(id);
  }
}
