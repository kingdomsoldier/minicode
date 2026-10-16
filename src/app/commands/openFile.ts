// minicode - comando: abrir un archivo desde disco

import * as files from '../../state/files.js';

/**
 * Añade un archivo al editor (usualmente leído desde disco).
 * Si ya estaba abierto, lo activa.
 */
export function abrirArchivoEnEditor(data: {
  path: string;
  name: string;
  content: string;
}): void {
  files.agregarArchivo({
    name: data.name,
    content: data.content,
    path: data.path,
    dirty: false,
  });
}
