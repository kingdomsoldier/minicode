// minicode - proveedor de sugerencias basado en snippets

import { SNIPPETS } from './snippets.js';
import type { Suggestion, SuggestionContext, SuggestionProvider } from '../types.js';

/**
 * Convierte un snippet al formato de sugerencia.
 * Añade un boost alto para que los snippets aparezcan antes que
 * las keywords cuando coinciden (por ejemplo, `for` antes que `format`).
 */
function snippetASugerencia(snippet: typeof SNIPPETS[number]): Suggestion {
  return {
    label: snippet.label,
    detail: snippet.detail,
    type: 'snippet',
    // Los snippets son muy valiosos en móvil (ahorran teclazos).
    // Les damos un boost alto para que ganen a keywords cuando empatan.
    boost: 10,
    apply: snippet.body,
  };
}

/**
 * Devuelve los snippets que coinciden con el prefijo.
 * Comparación case-insensitive. El prefijo debe coincidir al inicio
 * (no en medio) para evitar ruido.
 */
function sugerenciasPorPrefijo(prefix: string): Suggestion[] {
  if (!prefix) return [];

  const prefijo = prefix.toLowerCase();
  const coincidencias: Suggestion[] = [];

  for (const snippet of SNIPPETS) {
    if (snippet.prefix.startsWith(prefijo)) {
      coincidencias.push(snippetASugerencia(snippet));
    }
  }

  return coincidencias;
}

export const snippetsProvider: SuggestionProvider = {
  name: 'javascript-snippets',

  suggest(ctx: SuggestionContext): Suggestion[] {
    // No sugerir snippets después de un punto.
    // Después de `.` lo que esperas son métodos, no plantillas.
    if (ctx.afterDot) return [];

    // No sugerir en contextos donde no aplican
    // (dentro de strings, comentarios...). Por ahora no distinguimos,
    // lo dejamos para una fase posterior si molesta.

    return sugerenciasPorPrefijo(ctx.prefix);
  },
};
