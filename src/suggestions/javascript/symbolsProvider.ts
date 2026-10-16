// minicode - proveedor de símbolos del archivo activo
// Consulta el resultado del análisis y devuelve solo los símbolos
// visibles desde la posición actual del cursor.

import type {
  Suggestion,
  SuggestionContext,
  SuggestionProvider,
  SuggestionType,
} from '../types.js';
import type { Scope, Symbol as MinicodeSymbol } from '../../analysis/types.js';

// ===== Helpers de scopes =====

function cadenaDeScopes(scopes: Scope[], scopeId: string | null): Scope[] {
  if (!scopeId) return [];

  const porId = new Map<string, Scope>();
  for (const s of scopes) porId.set(s.id, s);

  const cadena: Scope[] = [];
  let actual = porId.get(scopeId);

  while (actual) {
    cadena.push(actual);
    actual = actual.parentId ? porId.get(actual.parentId) : undefined;
  }

  return cadena;
}

// ===== Filtro de visibilidad =====

function esVisible(
  simbolo: MinicodeSymbol,
  posicionCursor: number,
  scopeActualId: string | null,
  cadenaScopes: Scope[]
): boolean {
  const scopeDelSimbolo = cadenaScopes.find((s) => s.id === simbolo.scopeId);
  if (!scopeDelSimbolo) return false;

  const enScopeActual = simbolo.scopeId === scopeActualId;

  if (enScopeActual && simbolo.declarationStart > posicionCursor) {
    if (simbolo.isHoisted) return true;
    if (simbolo.isVar) return true;
    return false; // TDZ
  }

  return true;
}

// ===== Conversión a sugerencia =====

function tipoDeSimbolo(kind: MinicodeSymbol['kind']): SuggestionType {
  switch (kind) {
    case 'variable':
      return 'variable';
    case 'function':
      return 'function';
    case 'class':
      return 'class';
    case 'parameter':
      return 'parameter';
    case 'import':
      return 'import';
    case 'catchParam':
      return 'variable';
    default:
      return 'variable';
  }
}

/**
 * Solo mostramos detail cuando aporta información no obvia.
 * Por ejemplo: `var` vs `let` vs `const`, o el tipo de parámetro.
 */
function detalleDeSimbolo(simbolo: MinicodeSymbol): string | undefined {
  if (simbolo.kind === 'variable' && simbolo.isVar) {
    return 'var';
  }
  if (simbolo.kind === 'import') {
    return 'import';
  }
  return undefined;
}

function simboloASugerencia(simbolo: MinicodeSymbol): Suggestion {
  const detail = detalleDeSimbolo(simbolo);
  return {
    label: simbolo.name,
    ...(detail ? { detail } : {}),
    type: tipoDeSimbolo(simbolo.kind),
    boost: 20,
  };
}

// ===== Proveedor =====

export const symbolsProvider: SuggestionProvider = {
  name: 'javascript-symbols',

  suggest(ctx: SuggestionContext): Suggestion[] {
    if (!ctx.analisis) return [];

    const { prefix, afterDot, pos, scopeId, analisis } = ctx;

    if (afterDot) return [];
    if (!prefix) return [];

    const cadena = cadenaDeScopes(analisis.scopes, scopeId);
    if (cadena.length === 0) return [];

    const sugerencias: Suggestion[] = [];
    const prefijo = prefix.toLowerCase();
    const vistos = new Set<string>();

    for (const scope of cadena) {
      for (const simbolo of analisis.symbols) {
        if (simbolo.scopeId !== scope.id) continue;
        if (!simbolo.name.toLowerCase().startsWith(prefijo)) continue;
        if (vistos.has(simbolo.name)) continue;
        if (!esVisible(simbolo, pos, scopeId, cadena)) continue;

        vistos.add(simbolo.name);
        sugerencias.push(simboloASugerencia(simbolo));
      }
    }

    return sugerencias;
  },
};
