// minicode - cliente del worker de ejecución

export interface RunLog {
  level: 'log' | 'warn' | 'error' | 'info';
  args: string[];
}

export interface RunResult {
  logs: RunLog[];
  error?: { message: string; stack?: string };
  durationMs: number;
}

// ===== Mensajes entrantes del worker =====

interface IncomingLog {
  type: 'log';
  id: string;
  level: RunLog['level'];
  args: string[];
}

interface IncomingDone {
  type: 'done';
  id: string;
  durationMs: number;
}

interface IncomingError {
  type: 'error';
  id: string;
  message: string;
  stack?: string;
}

type Incoming = IncomingLog | IncomingDone | IncomingError;

// ===== Estado del cliente =====

let worker: Worker | null = null;
let contadorId = 0;

interface EjecucionPendiente {
  id: string;
  resolver: (r: RunResult) => void;
}

let ejecucionActual: EjecucionPendiente | null = null;

function obtenerWorker(): Worker {
  if (!worker) {
    worker = new Worker('/runner.worker.js', { type: 'module' });
  }
  return worker;
}

/**
 * Ejecuta `code` en el worker.
 * Devuelve un Promise que se resuelve cuando:
 *   - el código termina normalmente (con logs y duración)
 *   - el código lanza un error (con logs y stack)
 *   - el usuario cancela la ejecución (con mensaje de cancelación)
 */
export function ejecutarEnWorker(code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const w = obtenerWorker();
    const id = `run-${++contadorId}`;
    const logs: RunLog[] = [];

    ejecucionActual = { id, resolver: resolve };

    const onMessage = (event: MessageEvent<Incoming>) => {
      const msg = event.data;
      if (msg.id !== id) return;

      if (msg.type === 'log') {
        logs.push({ level: msg.level, args: msg.args });
        return;
      }

      ejecucionActual = null;

      if (msg.type === 'done') {
        limpiar();
        resolve({ logs, durationMs: msg.durationMs });
        return;
      }

      if (msg.type === 'error') {
        limpiar();
        resolve({
          logs,
          error: { message: msg.message, stack: msg.stack },
          durationMs: 0,
        });
      }
    };

    const limpiar = () => {
      w.removeEventListener('message', onMessage);
    };

    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'run', id, code });
  });
}

/**
 * Cancela la ejecución actual.
 * Mata el worker (necesario para poder detener `while(true)`),
 * resuelve el Promise pendiente con un mensaje de cancelación,
 * y deja el cliente listo para crear un worker nuevo en la próxima ejecución.
 */
export function cancelarEjecucion(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }

  if (ejecucionActual) {
    const { resolver } = ejecucionActual;
    ejecucionActual = null;
    resolver({
      logs: [],
      error: { message: 'Ejecución cancelada por el usuario' },
      durationMs: 0,
    });
  }
}

/**
 * Reinicia el worker sin cancelar nada.
 * Útil para limpiar variables globales de la sesión (por ejemplo,
 * si quieres empezar con un entorno "vacío" entre ejecuciones).
 */
export function reiniciarWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  ejecucionActual = null;
}

/**
 * ¿Hay una ejecución en curso ahora mismo?
 */
export function hayEjecucion(): boolean {
  return ejecucionActual !== null;
}
