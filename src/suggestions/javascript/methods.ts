// minicode - métodos de objetos nativos (se sugieren tras `.`)

export interface MethodEntry {
  name: string;
  detail: string;
  /**
   * Contextos en los que se sugiere este método.
   * Si es `null`, se sugiere en cualquier contexto.
   */
  contexts?: ('array' | 'string' | 'object' | 'promise' | 'console' | 'json' | 'number')[];
}

export const METHODS: MethodEntry[] = [
  // ===== Array =====
  { name: 'map', detail: 'Transformar cada elemento', contexts: ['array'] },
  { name: 'filter', detail: 'Filtrar elementos', contexts: ['array'] },
  { name: 'reduce', detail: 'Reducir a un valor', contexts: ['array'] },
  { name: 'forEach', detail: 'Iterar cada elemento', contexts: ['array'] },
  { name: 'find', detail: 'Buscar un elemento', contexts: ['array'] },
  { name: 'findIndex', detail: 'Índice del elemento', contexts: ['array'] },
  { name: 'some', detail: '¿Alguno cumple?', contexts: ['array'] },
  { name: 'every', detail: '¿Todos cumplen?', contexts: ['array'] },
  { name: 'includes', detail: '¿Incluye?', contexts: ['array'] },
  { name: 'indexOf', detail: 'Índice', contexts: ['array'] },
  { name: 'push', detail: 'Añadir al final', contexts: ['array'] },
  { name: 'pop', detail: 'Quitar del final', contexts: ['array'] },
  { name: 'shift', detail: 'Quitar del principio', contexts: ['array'] },
  { name: 'unshift', detail: 'Añadir al principio', contexts: ['array'] },
  { name: 'slice', detail: 'Subarray', contexts: ['array'] },
  { name: 'splice', detail: 'Modificar en sitio', contexts: ['array'] },
  { name: 'concat', detail: 'Concatenar', contexts: ['array'] },
  { name: 'join', detail: 'Unir en string', contexts: ['array'] },
  { name: 'sort', detail: 'Ordenar', contexts: ['array'] },
  { name: 'reverse', detail: 'Invertir', contexts: ['array'] },
  { name: 'flat', detail: 'Aplanar un nivel', contexts: ['array'] },
  { name: 'flatMap', detail: 'Map + flat', contexts: ['array'] },
  { name: 'fill', detail: 'Rellenar', contexts: ['array'] },
  { name: 'keys', detail: 'Iterador de índices', contexts: ['array'] },
  { name: 'values', detail: 'Iterador de valores', contexts: ['array'] },
  { name: 'entries', detail: 'Iterador de pares', contexts: ['array'] },

  // ===== String =====
  { name: 'split', detail: 'Dividir en array', contexts: ['string'] },
  { name: 'slice', detail: 'Subcadena', contexts: ['string'] },
  { name: 'substring', detail: 'Subcadena', contexts: ['string'] },
  { name: 'substr', detail: 'Subcadena (legacy)', contexts: ['string'] },
  { name: 'replace', detail: 'Reemplazar una vez', contexts: ['string'] },
  { name: 'replaceAll', detail: 'Reemplazar todas', contexts: ['string'] },
  { name: 'toUpperCase', detail: 'A mayúsculas', contexts: ['string'] },
  { name: 'toLowerCase', detail: 'A minúsculas', contexts: ['string'] },
  { name: 'trim', detail: 'Quitar espacios extremos', contexts: ['string'] },
  { name: 'trimStart', detail: 'Quitar espacios al inicio', contexts: ['string'] },
  { name: 'trimEnd', detail: 'Quitar espacios al final', contexts: ['string'] },
  { name: 'startsWith', detail: '¿Empieza con?', contexts: ['string'] },
  { name: 'endsWith', detail: '¿Termina con?', contexts: ['string'] },
  { name: 'includes', detail: '¿Contiene?', contexts: ['string'] },
  { name: 'indexOf', detail: 'Posición', contexts: ['string'] },
  { name: 'lastIndexOf', detail: 'Última posición', contexts: ['string'] },
  { name: 'charAt', detail: 'Carácter en posición', contexts: ['string'] },
  { name: 'padStart', detail: 'Rellenar por delante', contexts: ['string'] },
  { name: 'padEnd', detail: 'Rellenar por detrás', contexts: ['string'] },
  { name: 'repeat', detail: 'Repetir', contexts: ['string'] },
  { name: 'match', detail: 'Coincidencia con regex', contexts: ['string'] },
  { name: 'matchAll', detail: 'Todas las coincidencias', contexts: ['string'] },

  // ===== Object =====
  { name: 'keys', detail: 'Claves del objeto', contexts: ['object'] },
  { name: 'values', detail: 'Valores del objeto', contexts: ['object'] },
  { name: 'entries', detail: 'Pares clave-valor', contexts: ['object'] },
  { name: 'assign', detail: 'Copiar propiedades', contexts: ['object'] },
  { name: 'freeze', detail: 'Congelar', contexts: ['object'] },
  { name: 'fromEntries', detail: 'Desde pares', contexts: ['object'] },

  // ===== Promise =====
  { name: 'then', detail: 'Continuar', contexts: ['promise'] },
  { name: 'catch', detail: 'Capturar error', contexts: ['promise'] },
  { name: 'finally', detail: 'Siempre', contexts: ['promise'] },
  { name: 'all', detail: 'Esperar a todas', contexts: ['promise'] },
  { name: 'allSettled', detail: 'Esperar a todas (siempre)', contexts: ['promise'] },
  { name: 'race', detail: 'Primera que resuelva', contexts: ['promise'] },
  { name: 'any', detail: 'Primera que resuelva OK', contexts: ['promise'] },

  // ===== Console =====
  { name: 'log', detail: 'Imprimir', contexts: ['console'] },
  { name: 'warn', detail: 'Advertencia', contexts: ['console'] },
  { name: 'error', detail: 'Error', contexts: ['console'] },
  { name: 'info', detail: 'Info', contexts: ['console'] },
  { name: 'debug', detail: 'Debug', contexts: ['console'] },
  { name: 'table', detail: 'Tabla', contexts: ['console'] },
  { name: 'time', detail: 'Iniciar temporizador', contexts: ['console'] },
  { name: 'timeEnd', detail: 'Terminar temporizador', contexts: ['console'] },
  { name: 'group', detail: 'Agrupar', contexts: ['console'] },
  { name: 'groupEnd', detail: 'Cerrar grupo', contexts: ['console'] },

  // ===== JSON =====
  { name: 'parse', detail: 'String → objeto', contexts: ['json'] },
  { name: 'stringify', detail: 'Objeto → string', contexts: ['json'] },

  // ===== Number =====
  { name: 'toFixed', detail: 'Fijar decimales', contexts: ['number'] },
  { name: 'toString', detail: 'A string', contexts: ['number'] },
  { name: 'toPrecision', detail: 'Precisión', contexts: ['number'] },
];
