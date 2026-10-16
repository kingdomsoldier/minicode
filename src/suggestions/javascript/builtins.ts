// minicode - objetos, funciones y literales globales

export interface BuiltinEntry {
  /** Nombre tal cual se escribe */
  name: string;
  /** Categoría para el detalle del popup */
  kind: 'object' | 'function' | 'constructor' | 'literal';
  /** Descripción corta */
  detail: string;
}

export const BUILTINS: BuiltinEntry[] = [
  // ===== Objetos globales =====
  { name: 'console', kind: 'object', detail: 'Consola' },
  { name: 'Math', kind: 'object', detail: 'Funciones matemáticas' },
  { name: 'JSON', kind: 'object', detail: 'JSON' },
  { name: 'Object', kind: 'constructor', detail: 'Objetos' },
  { name: 'Array', kind: 'constructor', detail: 'Arrays' },
  { name: 'String', kind: 'constructor', detail: 'Strings' },
  { name: 'Number', kind: 'constructor', detail: 'Números' },
  { name: 'Boolean', kind: 'constructor', detail: 'Booleanos' },
  { name: 'Date', kind: 'constructor', detail: 'Fechas' },
  { name: 'RegExp', kind: 'constructor', detail: 'Expresiones regulares' },
  { name: 'Map', kind: 'constructor', detail: 'Mapa clave-valor' },
  { name: 'Set', kind: 'constructor', detail: 'Conjunto sin duplicados' },
  { name: 'WeakMap', kind: 'constructor', detail: 'Mapa de referencias débiles' },
  { name: 'WeakSet', kind: 'constructor', detail: 'Conjunto de referencias débiles' },
  { name: 'Promise', kind: 'constructor', detail: 'Promesa' },
  { name: 'Symbol', kind: 'constructor', detail: 'Símbolo único' },
  { name: 'Error', kind: 'constructor', detail: 'Error' },
  { name: 'TypeError', kind: 'constructor', detail: 'Error de tipo' },
  { name: 'RangeError', kind: 'constructor', detail: 'Error de rango' },
  { name: 'Proxy', kind: 'constructor', detail: 'Proxy de objeto' },
  { name: 'Reflect', kind: 'object', detail: 'Reflexión' },

  // ===== Entorno =====
  { name: 'window', kind: 'object', detail: 'Ventana global' },
  { name: 'document', kind: 'object', detail: 'Documento' },
  { name: 'navigator', kind: 'object', detail: 'Navegador' },
  { name: 'location', kind: 'object', detail: 'URL actual' },
  { name: 'localStorage', kind: 'object', detail: 'Almacén persistente' },
  { name: 'sessionStorage', kind: 'object', detail: 'Almacén de sesión' },
  { name: 'history', kind: 'object', detail: 'Historial de navegación' },

  // ===== Funciones globales =====
  { name: 'parseInt', kind: 'function', detail: 'Entero desde string' },
  { name: 'parseFloat', kind: 'function', detail: 'Decimal desde string' },
  { name: 'isNaN', kind: 'function', detail: '¿Es NaN?' },
  { name: 'isFinite', kind: 'function', detail: '¿Es finito?' },
  { name: 'encodeURIComponent', kind: 'function', detail: 'Codificar URI' },
  { name: 'decodeURIComponent', kind: 'function', detail: 'Decodificar URI' },
  { name: 'setTimeout', kind: 'function', detail: 'Temporizador' },
  { name: 'clearTimeout', kind: 'function', detail: 'Cancelar temporizador' },
  { name: 'setInterval', kind: 'function', detail: 'Intervalo' },
  { name: 'clearInterval', kind: 'function', detail: 'Cancelar intervalo' },
  { name: 'fetch', kind: 'function', detail: 'Petición HTTP' },
  { name: 'structuredClone', kind: 'function', detail: 'Clonar profundo' },
  { name: 'queueMicrotask', kind: 'function', detail: 'Microtarea' },
  { name: 'requestAnimationFrame', kind: 'function', detail: 'Frame de render' },

  // ===== Literales =====
  { name: 'true', kind: 'literal', detail: 'true' },
  { name: 'false', kind: 'literal', detail: 'false' },
  { name: 'null', kind: 'literal', detail: 'null' },
  { name: 'undefined', kind: 'literal', detail: 'undefined' },
  { name: 'NaN', kind: 'literal', detail: 'NaN' },
  { name: 'Infinity', kind: 'literal', detail: 'Infinity' },
];
