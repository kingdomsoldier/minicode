// minicode - comando: eliminar archivo activo del disco

import { serverFS } from '../../files/serverFS.js';
import * as files from '../../state/files.js';

/**
 * Elimina el archivo activo del disco.
 * Solo funciona si el archivo tiene `path`.
 */
export async function eliminarArchivoActivo(): Promise<void> {
  const active = files.getActiveFile();
  if (!active || !active.path) return;

  const ok = window.confirm(
    `¿Eliminar "${active.name}" del disco?\n\nEsta acción no se puede deshacer.`
  );
  if (!ok) return;

  try {
    await serverFS.delete(active.path);
    files.cerrarArchivo(active.id);
  } catch (err: any) {
    window.alert('Error al eliminar: ' + err.message);
  }
}
