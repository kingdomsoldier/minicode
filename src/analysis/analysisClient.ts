// minicode - cliente del worker de análisis

import type {
  AnalysisResult,
  AnalysisRequest,
  AnalysisResponse,
} from './types.js';

// ===== Worker singleton =====

let worker: Worker | null = null;

function obtenerWorker(): Worker {
  if (!worker) {
    worker = new Worker('/analysis.worker.js', { type: 'module' });
  }
  return worker;
}

/**
 * Analiza el código en el worker.
 * Devuelve un Promise que se resuelve con el resultado.
 *
 * Importante: no hay cancelación a mitad del parseo. Si envías un nuevo
 * análisis mientras hay uno en curso, acorn termina el primero y luego
 * procesa el segundo. Como son rápidos (<50ms en archivos normales),
 * no es un problema real.
 *
 * El cliente (quien llama) es responsable de descartar resultados viejos
 * comparando `version` y `fileId`.
 */
export function analizar(
  fileId: string,
  version: number,
  code: string
): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    const w = obtenerWorker();

    const onMessage = (event: MessageEvent<AnalysisResponse>) => {
      const resultado = event.data;
      // Filtramos por fileId y version: si no coinciden, ignoramos
      if (resultado.fileId !== fileId || resultado.version !== version) {
        return;
      }
      limpiar();
      resolve(resultado);
    };

    const limpiar = () => {
      w.removeEventListener('message', onMessage);
    };

    w.addEventListener('message', onMessage);

    const req: AnalysisRequest = {
      type: 'analyze',
      fileId,
      version,
      code,
    };
    w.postMessage(req);
  });
}

/**
 * Reinicia el worker. Útil si queda en un estado raro.
 */
export function reiniciarAnalysisWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
