// minicode - proveedor de propiedades de objetos definidos por el usuario
// Consulta `analisis.objects` para saber qué propiedades tiene cada variable.

import type {
  Suggestion,
  SuggestionContext,
  SuggestionProvider,
} from '../types.js';

// ===== Helper: normalizar nombre de objeto =====

/**
 * Dado el `objectName` extraído del editor, devuelve el nombre "raíz"
 * que podríamos encontrar en el análisis.
 *
 * Ejemplos:
 *   "usuario"            → "usuario"
 *   "usuario.datos"      → "usuario"  (acceso anidado, buscamos el raíz)
 *   "this"               → null       (por ahora no soportamos this.)
 *   "respuesta.json"     → "respuesta"
 */
function nombreRaiz(objectName: string | undefined): string | null {
  if (!objectName) return null;

  // Descartamos this/super (por ahora)
  if (objectName === 'this' || objectName === 'super') return null;

  // Tomamos la primera parte antes del punto
  const partes = objectName.split('.');
  const raiz = partes[0];

  // Si tiene espacios o caracteres raros, descartamos
  if (!/^[A-Za-z_$][\w$]*$/.test(raiz)) return null;

  return raiz;
}

// ===== Proveedor =====

export const propertiesProvider: SuggestionProvider = {
  name: 'javascript-properties',

  suggest(ctx: SuggestionContext): Suggestion[] {
    // Solo aplica después de un punto
    if (!ctx.afterDot) return [];
    if (!ctx.analisis) return [];

    const raiz = nombreRaiz(ctx.objectName);
    if (!raiz) return [];

    // Buscar en el análisis alguna "forma" cuyo nombre coincida con la raíz
    const formas = ctx.analisis.objects.filter(
      (o) => o.variableName === raiz
    );

    if (formas.length === 0) return [];

    // Fusionar propiedades de todas las formas con el mismo nombre
    // (por ejemplo, si hay dos `user` en distintos scopes)
    const propiedades = new Set<string>();
    for (const f of formas) {
      for (const p of f.properties) {
        propiedades.add(p);
      }
    }

    if (propiedades.size === 0) return [];

    const prefijo = ctx.prefix.toLowerCase();
    const sugerencias: Suggestion[] = [];

    for (const prop of propiedades) {
      if (prefijo && !prop.toLowerCase().startsWith(prefijo)) continue;

      sugerencias.push({
        label: prop,
        detail: `propiedad de ${raiz}`,
        type: 'property',
        // Boost muy alto: son las propiedades REALES del objeto,
        // deben ganar a cualquier método genérico.
        boost: 30,
      });
    }

    return sugerencias;
  },
};
