// minicode - comando: renombrar archivo activo

import { serverFS } from '../../files/serverFS.js';
import * as files from '../../state/files.js';

/**
 * Renombra el archivo activo.
 * - Si tiene `path`, también mueve el archivo en disco.
 * - Si no lo tiene, solo cambia el nombre en memoria.
 */
export async function renombrarArchivoActivo(): Promise<void> {
  const active = files.getActiveFile();
  if (!active) return;

  const nuevoNombre = window.prompt(
    'Nuevo nombre del archivo:',
    active.name
  );

  if (!nuevoNombre) return;

  const nombreLimpio = nuevoNombre.trim();
  if (!nombreLimpio || nombreLimpio === active.name) return;

  // Si el archivo está en disco, renombrarlo también allí
  if (active.path) {
    // Calcular nueva ruta conservando el directorio
    const partes = active.path.split('/');
    partes[partes.length - 1] = nombreLimpio;
    const nuevaRuta = partes.join('/');

    try {
      await serverFS.rename(active.path, nuevaRuta);
      files.actualizarArchivo(active.id, {
        name: nombreLimpio,
        path: nuevaRuta,
      });
    } catch (err: any) {
      window.alert('Error al renombrar: ' + err.message);
    }
  } else {
    // Solo en memoria
    files.actualizarArchivo(active.id, { name: nombreLimpio });
  }
}
