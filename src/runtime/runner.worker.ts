// minicode - worker de ejecución de código
// Ejecuta el código del usuario y captura console.* + errores

// ===== Tipos de mensajes =====

interface IncomingMessage {
  type: 'run';
  id: string;
  code: string;
}

interface OutgoingLog {
  type: 'log';
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  args: string[];
}

interface OutgoingDone {
  type: 'done';
  id: string;
  durationMs: number;
}

interface OutgoingError {
  type: 'error';
  id: string;
  message: string;
  stack?: string;
}

type OutgoingMessage = OutgoingLog | OutgoingDone | OutgoingError;

// ===== Captura de console =====

let currentId = '';

/**
 * Convierte cualquier valor a string legible.
 * Es necesario porque postMessage no puede enviar funciones, DOM, etc.
 */
function serializar(valor: unknown): string {
  if (valor === null) return 'null';
  if (valor === undefined) return 'undefined';

  const t = typeof valor;
  if (t === 'string') return valor as string;
  if (t === 'number' || t === 'boolean') return String(valor);
  if (t === 'bigint') return `${valor}n`;
  if (t === 'symbol') return (valor as symbol).toString();
  if (t === 'function') {
    const fn = valor as Function;
    return `ƒ ${fn.name || 'anonymous'}()`;
  }

  if (valor instanceof Error) {
    return `${valor.name}: ${valor.message}`;
  }

  if (valor instanceof Map) {
    return `Map(${valor.size}) ${JSON.stringify(Object.fromEntries(valor as Map<unknown, unknown>))}`;
  }

  if (valor instanceof Set) {
    return `Set(${valor.size}) ${JSON.stringify([...(valor as Set<unknown>)])}`;
  }

  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

function enviar(msg: OutgoingMessage): void {
  self.postMessage(msg);
}

// Guardamos las funciones nativas de console por si acaso
const consoleNativo = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
};

function capturar(
  level: 'log' | 'warn' | 'error' | 'info',
  args: unknown[]
): void {
  // Si no hay un id activo, no estamos dentro de una ejecución
  // (por ejemplo, un log del propio worker) → consola nativa
  if (!currentId) {
    consoleNativo[level](...args);
    return;
  }

  enviar({
    type: 'log',
    id: currentId,
    level,
    args: args.map(serializar),
  });
}

console.log = (...args) => capturar('log', args);
console.warn = (...args) => capturar('warn', args);
console.error = (...args) => capturar('error', args);
console.info = (...args) => capturar('info', args);

// ===== Ejecución =====

/**
 * Constructor de funciones async.
 * `new AsyncFunction(code)` permite usar `await` a nivel top-level
 * dentro del código del usuario, sin envolverlo en una función manualmente.
 */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function ejecutar(id: string, code: string): Promise<void> {
  currentId = id;
  const inicio = performance.now();

  try {
    const fn = new AsyncFunction(code);
    const resultado = await fn();

    // Si el código devuelve un valor (última expresión), lo mostramos
    if (resultado !== undefined) {
      enviar({
        type: 'log',
        id,
        level: 'log',
        args: [`← ${serializar(resultado)}`],
      });
    }

    enviar({
      type: 'done',
      id,
      durationMs: Math.round(performance.now() - inicio),
    });
  } catch (err: any) {
    enviar({
      type: 'error',
      id,
      message: err?.message ?? String(err),
      stack: err?.stack,
    });
  } finally {
    currentId = '';
  }
}

// ===== Escucha de mensajes =====

self.addEventListener('message', (event) => {
  const data = event.data as IncomingMessage;
  if (data?.type === 'run') {
    ejecutar(data.id, data.code);
  }
});

export {};
