// minicode - comando: recargar todos los archivos desde disco

import { serverFS } from '../../files/serverFS.js';
import * as files from '../../state/files.js';

export interface ReloadAllResult {
  recargados: number;
  fallidos: number;
}

/**
 * Recarga todos los archivos vinculados a disco.
 * Si hay cambios pendientes en algunos, pide confirmación global.
 */
export async function recargarTodo(): Promise<ReloadAllResult> {
  const todos = files.getState().files;
  const vinculados = todos.filter((f) => f.path);

  if (vinculados.length === 0) {
    return { recargados: 0, fallidos: 0 };
  }

  // Si hay cambios sin guardar en alguno, avisar
  const conCambios = vinculados.filter((f) => f.dirty);
  if (conCambios.length > 0) {
    const nombres = conCambios.map((f) => `• ${f.name}`).join('\n');
    const ok = window.confirm(
      `${conCambios.length} archivo(s) tienen cambios sin guardar:\n\n` +
        `${nombres}\n\n` +
        `Si recargas desde disco, perderás esos cambios.\n\n` +
        `¿Continuar?`
    );
    if (!ok) {
      return { recargados: 0, fallidos: 0 };
    }
  }

  let recargados = 0;
  let fallidos = 0;

  for (const f of vinculados) {
    try {
      const file = await serverFS.read(f.path!);
      files.actualizarContenidoSilencioso(f.id, file.content);
      recargados++;
    } catch (err: any) {
      console.error(`Error al recargar "${f.name}":`, err.message);
      fallidos++;
    }
  }

  return { recargados, fallidos };
}
