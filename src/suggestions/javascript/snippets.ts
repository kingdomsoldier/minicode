// minicode - snippets curados de JavaScript
// Cada snippet tiene un prefijo corto que se escribe para activarlo.

export interface Snippet {
  /** Prefijo que el usuario escribe para activar el snippet */
  prefix: string;
  /** Texto que se muestra en el popup */
  label: string;
  /** Descripción corta mostrada a la derecha */
  detail: string;
  /**
   * Cuerpo del snippet. El marcador `${}` indica dónde queda el cursor
   * después de insertarlo. Solo se soporta un marcador por snippet.
   */
  body: string;
}

export const SNIPPETS: Snippet[] = [
  // ===== Console =====
  {
    prefix: 'log',
    label: 'console.log',
    detail: 'Imprimir en consola',
    body: 'console.log(${})',
  },
  {
    prefix: 'warn',
    label: 'console.warn',
    detail: 'Advertencia',
    body: 'console.warn(${})',
  },
  {
    prefix: 'error',
    label: 'console.error',
    detail: 'Error',
    body: 'console.error(${})',
  },
  {
    prefix: 'info',
    label: 'console.info',
    detail: 'Info',
    body: 'console.info(${})',
  },

  // ===== Funciones =====
  {
    prefix: 'fn',
    label: 'function',
    detail: 'Función declarada',
    body: 'function ${}() {\n  \n}',
  },
  {
    prefix: 'afn',
    label: 'async function',
    detail: 'Función asíncrona',
    body: 'async function ${}() {\n  \n}',
  },
  {
    prefix: 'arrow',
    label: 'arrow function',
    detail: 'Función flecha',
    body: 'const ${} = () => {\n  \n};',
  },
  {
    prefix: 'aarrow',
    label: 'async arrow',
    detail: 'Función flecha asíncrona',
    body: 'const ${} = async () => {\n  \n};',
  },

  // ===== Clases =====
  {
    prefix: 'class',
    label: 'class',
    detail: 'Declaración de clase',
    body: 'class ${} {\n  constructor() {\n    \n  }\n}',
  },

  // ===== Control de flujo =====
  {
    prefix: 'if',
    label: 'if',
    detail: 'Condicional',
    body: 'if (${}) {\n  \n}',
  },
  {
    prefix: 'ifelse',
    label: 'if/else',
    detail: 'Condicional con else',
    body: 'if (${}) {\n  \n} else {\n  \n}',
  },
  {
    prefix: 'for',
    label: 'for',
    detail: 'Bucle for clásico',
    body: 'for (let i = 0; i < ${}; i++) {\n  \n}',
  },
  {
    prefix: 'forof',
    label: 'for...of',
    detail: 'Iterar sobre iterable',
    body: 'for (const item of ${}) {\n  \n}',
  },
  {
    prefix: 'forin',
    label: 'for...in',
    detail: 'Iterar sobre claves',
    body: 'for (const key in ${}) {\n  \n}',
  },
  {
    prefix: 'while',
    label: 'while',
    detail: 'Bucle while',
    body: 'while (${}) {\n  \n}',
  },
  {
    prefix: 'switch',
    label: 'switch',
    detail: 'Switch con cases',
    body: 'switch (${}) {\n  case value:\n    break;\n  default:\n    break;\n}',
  },
  {
    prefix: 'ternary',
    label: 'ternario',
    detail: 'Operador ternario',
    body: '${} ? valorVerdadero : valorFalso',
  },

  // ===== Errores =====
  {
    prefix: 'try',
    label: 'try/catch',
    detail: 'Bloque try/catch',
    body: 'try {\n  ${}\n} catch (err) {\n  console.error(err);\n}',
  },
  {
    prefix: 'trycf',
    label: 'try/catch/finally',
    detail: 'Try completo',
    body: 'try {\n  ${}\n} catch (err) {\n  console.error(err);\n} finally {\n  \n}',
  },

  // ===== Asincronía =====
  {
    prefix: 'promise',
    label: 'new Promise',
    detail: 'Promesa manual',
    body: 'new Promise((resolve, reject) => {\n  ${}\n})',
  },
  {
    prefix: 'await',
    label: 'await',
    detail: 'Esperar promesa',
    body: 'await ${}',
  },
  {
    prefix: 'settimeout',
    label: 'setTimeout',
    detail: 'Temporizador',
    body: 'setTimeout(() => {\n  ${}\n}, 1000)',
  },
  {
    prefix: 'setinterval',
    label: 'setInterval',
    detail: 'Intervalo repetido',
    body: 'setInterval(() => {\n  ${}\n}, 1000)',
  },

  // ===== Arrays =====
  {
    prefix: 'map',
    label: '.map()',
    detail: 'Transformar cada elemento',
    body: '.map((${}) => )',
  },
  {
    prefix: 'filter',
    label: '.filter()',
    detail: 'Filtrar elementos',
    body: '.filter((${}) => )',
  },
  {
    prefix: 'reduce',
    label: '.reduce()',
    detail: 'Reducir a un valor',
    body: '.reduce((acc, item) => {\n  return ${}\n}, valorInicial)',
  },
  {
    prefix: 'foreach',
    label: '.forEach()',
    detail: 'Iterar sobre array',
    body: '.forEach((${}) => )',
  },
  {
    prefix: 'find',
    label: '.find()',
    detail: 'Buscar elemento',
    body: '.find((${}) => )',
  },

  // ===== Módulos =====
  {
    prefix: 'import',
    label: 'import',
    detail: 'Importar módulo',
    body: "import { ${} } from './modulo.js';",
  },
  {
    prefix: 'exportfn',
    label: 'export function',
    detail: 'Exportar función',
    body: 'export function ${}() {\n  \n}',
  },
  {
    prefix: 'exportdefault',
    label: 'export default',
    detail: 'Exportar por defecto',
    body: 'export default ${}',
  },

  // ===== Utilidades =====
  {
    prefix: 'event',
    label: 'addEventListener',
    detail: 'Escuchar evento',
    body: "${}.addEventListener('click', () => {\n  \n})",
  },
  {
    prefix: 'fetch',
    label: 'fetch',
    detail: 'Petición HTTP',
    body: "const res = await fetch('${}');\nconst data = await res.json();",
  },
  {
    prefix: 'obj',
    label: 'objeto literal',
    detail: 'Objeto con propiedades',
    body: 'const ${} = {\n  propiedad: valor,\n};',
  },
  {
    prefix: 'arr',
    label: 'array literal',
    detail: 'Array vacío',
    body: 'const ${} = [];',
  },
];
