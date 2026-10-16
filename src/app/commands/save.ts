// minicode - comando: guardar archivo activo

import { serverFS } from '../../files/serverFS.js';
import * as files from '../../state/files.js';
import type { FileBrowserInstance } from '../../ui/fileBrowser.js';

/**
 * Guarda el archivo activo.
 * - Si tiene `path`, escribe directamente en disco.
 * - Si no lo tiene, abre el file browser en modo saveAs.
 */
export function crearGuardarArchivo(
  fileBrowser: FileBrowserInstance
): () => Promise<void> {
  return async () => {
    const active = files.getActiveFile();
    if (!active) return;

    // Archivo vinculado a disco: guardar directamente
    if (active.path) {
      try {
        await serverFS.write(active.path, active.content);
        files.marcarGuardado(active.id);
      } catch (err: any) {
        window.alert('Error al guardar: ' + err.message);
      }
      return;
    }

    // Archivo nuevo: pedir carpeta y nombre con el file browser
    const resultado = await fileBrowser.saveAs({
      defaultName: active.name,
      startPath: '.',
    });

    if (!resultado) return;

    const rutaFinal = resultado.folder === '.'
      ? resultado.name
      : `${resultado.folder}/${resultado.name}`;

    try {
      try {
        await serverFS.create(rutaFinal, active.content);
      } catch (err: any) {
        if (String(err.message).includes('Ya existe')) {
          const ok = window.confirm(
            `"${rutaFinal}" ya existe.\n\n¿Sobrescribir?`
          );
          if (!ok) return;
          await serverFS.write(rutaFinal, active.content);
        } else {
          throw err;
        }
      }

      files.vincularArchivo(active.id, rutaFinal, resultado.name);
    } catch (err: any) {
      window.alert('Error al guardar: ' + err.message);
    }
  };
}
