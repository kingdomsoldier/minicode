// minicode - tipos compartidos del sistema de sugerencias

import type { AnalysisResult } from '../analysis/types.js';

/**
 * Tipo de sugerencia. Determina el icono y color con que se muestra.
 */
export type SuggestionType =
  | 'snippet'    // plantilla de código (log → console.log())
  | 'keyword'    // palabra reservada (const, function, if)
  | 'builtin'    // objeto/función global (console, Math, Promise)
  | 'method'     // método de objeto (map, filter, log)
  | 'variable'   // variable declarada por el usuario
  | 'function'   // función declarada por el usuario
  | 'class'      // clase declarada por el usuario
  | 'parameter'  // parámetro de función
  | 'property'   // propiedad de objeto literal
  | 'import';    // identificador importado

/**
 * Una sugerencia concreta. Se convierte a `Completion` de CodeMirror.
 */
export interface Suggestion {
  /** Texto que se muestra y, por defecto, se inserta */
  label: string;
  /** Texto secundario mostrado a la derecha (ej: "función", "console.log") */
  detail?: string;
  /** Categoría que determina el icono/color */
  type: SuggestionType;
  /**
   * Puntuación de relevancia. Cuanto más alto, antes aparece.
   * Se suma al scoring interno de CodeMirror.
   */
  boost?: number;
  /**
   * Texto a insertar en lugar del prefijo. Si no se especifica, se usa `label`.
   * Permite plantillas con posiciones de cursor: "console.log(${})"
   */
  apply?: string;
  /**
   * Si se especifica junto con `apply`, indica la posición del cursor
   * dentro del texto aplicado (por ejemplo, dentro de los paréntesis).
   */
  cursorOffset?: number;
}

/**
 * Contexto que recibe cada proveedor al pedir sugerencias.
 * Contiene todo lo que puede necesitar para decidir qué ofrecer.
 */
export interface SuggestionContext {
  /** Prefijo que el usuario ha escrito antes del cursor */
  prefix: string;
  /** Posición actual del cursor (offset en el documento) */
  pos: number;
  /** Contenido completo del archivo */
  code: string;
  /** Resultado del análisis más reciente (puede ser null si aún no se ha analizado) */
  analisis: AnalysisResult | null;
  /** ¿El prefijo está precedido por un punto? Ejemplo: `variable.` */
  afterDot: boolean;
  /**
   * Si `afterDot` es true, nombre del objeto antes del punto.
   * Ejemplo: en `usuario.no|`, `objectName` es "usuario".
   */
  objectName?: string;
  /**
   * Scope activo en la posición del cursor (el más profundo que lo contiene).
   * Puede ser null si aún no hay análisis.
   */
  scopeId: string | null;
}

/**
 * Un proveedor de sugerencias. Cada lenguaje implementa uno o varios
 * y los registra en el registro global (`src/suggestions/index.ts`).
 */
export interface SuggestionProvider {
  /** Nombre único para debug */
  name: string;
  /** Función que devuelve las sugerencias para un contexto dado */
  suggest(ctx: SuggestionContext): Suggestion[];
}

/**
 * Registro de proveedores por lenguaje.
 * Cada lenguaje tiene una lista ordenada: el orden importa para la prioridad.
 */
export interface LanguageSuggestionConfig {
  /** Código de lenguaje (usado en `FileData.language`) */
  language: string;
  /** Proveedores en orden de prioridad (mayor primero) */
  providers: SuggestionProvider[];
}
