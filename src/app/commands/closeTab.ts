// minicode - comando: cerrar un tab (con confirmación si hay cambios)

import * as files from '../../state/files.js';

/**
 * Cierra un tab. Si el archivo tiene cambios sin guardar, pide confirmación.
 */
export function cerrarTab(id: string): void {
  const file = files.getState().files.find((f) => f.id === id);
  if (!file) return;

  if (file.dirty) {
    const ok = window.confirm(
      `"${file.name}" tiene cambios sin guardar.\n\n¿Cerrar de todos modos?`
    );
    if (!ok) return;
  }

  files.cerrarArchivo(id);
}

/**
 * Cierra el tab activo.
 */
export function cerrarTabActivo(): void {
  const active = files.getActiveFile();
  if (active) cerrarTab(active.id);
}
