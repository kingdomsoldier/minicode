// minicode - comando: guardar todos los archivos abiertos

import { serverFS } from '../../files/serverFS.js';
import * as files from '../../state/files.js';

export interface SaveAllResult {
  guardados: number;
  fallidos: number;
}

/**
 * Guarda todos los archivos vinculados a disco con cambios pendientes.
 * Los archivos en memoria (sin path) NO se guardan automáticamente,
 * porque requerirían pedir ruta uno por uno.
 */
export async function guardarTodo(): Promise<SaveAllResult> {
  const todos = files.getState().files;
  const pendientes = todos.filter((f) => f.dirty && f.path);

  let guardados = 0;
  let fallidos = 0;

  for (const f of pendientes) {
    try {
      await serverFS.write(f.path!, f.content);
      files.marcarGuardado(f.id);
      guardados++;
    } catch (err: any) {
      console.error(`Error al guardar "${f.name}":`, err.message);
      fallidos++;
    }
  }

  return { guardados, fallidos };
}
