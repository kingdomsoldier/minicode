// minicode - comando: ejecutar el archivo activo

import { ejecutarEnWorker } from '../../runtime/runInWorker.js';
import * as files from '../../state/files.js';
import type { OutputInstance } from '../../ui/output.js';

/**
 * Devuelve la función que ejecuta el archivo activo.
 *
 * @param output - Panel donde mostrar el resultado
 * @param onEstado - Callback para notificar cambios de estado (ejecutando: true/false)
 */
export function crearEjecutar(
  output: OutputInstance,
  onEstado: (ejecutando: boolean) => void
): () => Promise<void> {
  return async () => {
    output.abrir();

    const active = files.getActiveFile();

    if (!active) {
      output.mostrarError('No hay archivo activo');
      return;
    }

    if (active.language !== 'javascript') {
      output.mostrarError(
        `Solo se puede ejecutar JavaScript por ahora.\n` +
          `Este archivo es "${active.language}".`
      );
      return;
    }

    output.mostrarEjecutando();
    onEstado(true);

    try {
      const resultado = await ejecutarEnWorker(active.content);
      output.mostrar(resultado);
    } catch (err: any) {
      output.mostrarError(
        'Error al ejecutar: ' + (err?.message ?? String(err))
      );
    } finally {
      onEstado(false);
    }
  };
}
