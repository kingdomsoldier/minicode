// minicode - comando: crear archivo nuevo

import * as files from '../../state/files.js';

/**
 * Crea un archivo nuevo vacío en memoria.
 * El usuario le dará ruta al guardar.
 */
export function crearArchivoNuevo(): void {
  files.crearArchivo();
}
