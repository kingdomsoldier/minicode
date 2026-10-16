// minicode - comando: recargar archivo activo desde disco

import { serverFS } from '../../files/serverFS.js';
import * as files from '../../state/files.js';

/**
 * Recarga el archivo activo desde disco.
 * Si tiene cambios sin guardar, pide confirmación.
 */
export async function recargarArchivoActivo(): Promise<void> {
  const active = files.getActiveFile();
  if (!active || !active.path) return;

  if (active.dirty) {
    const ok = window.confirm(
      `"${active.name}" tiene cambios sin guardar.\n\n` +
        `Si recargas desde disco, perderás esos cambios.\n\n` +
        `¿Continuar?`
    );
    if (!ok) return;
  }

  try {
    const file = await serverFS.read(active.path);
    files.actualizarContenidoSilencioso(active.id, file.content);
  } catch (err: any) {
    window.alert('Error al recargar: ' + err.message);
  }
}
