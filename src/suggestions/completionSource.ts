// minicode - CompletionSource de CodeMirror que conecta con nuestros providers

import type {
  CompletionContext,
  CompletionResult,
  Completion,
} from '@codemirror/autocomplete';
import { obtenerProveedores } from './index.js';
import { getServicioAnalisis } from '../analysis/analysisService.js';
import type { Suggestion, SuggestionContext, SuggestionType } from './types.js';

// ===== Configuración del autocompletado =====

const MIN_PREFIX_LENGTH = 2;
const MAX_SUGGESTIONS = 12;

/**
 * Tipos que NUNCA muestran detail.
 * El icono ya dice qué son, y el texto genérico ("variable", "propiedad de X")
 * añade ruido sin aportar nada.
 */
const TIPOS_SIN_DETAIL: Set<SuggestionType> = new Set([
  'variable',
  'function',
  'class',
  'parameter',
  'property',
  'import',
]);

// ===== Detección del prefijo =====

function detectarPrefijo(context: CompletionContext): {
  prefix: string;
  from: number;
  afterDot: boolean;
  objectName?: string;
} {
  const texto = context.state.doc.toString();
  const pos = context.pos;

  let inicio = pos;
  while (inicio > 0 && /[\w$]/.test(texto[inicio - 1] ?? '')) {
    inicio--;
  }
  const prefix = texto.slice(inicio, pos);

  let afterDot = false;
  let objectName: string | undefined;

  if (inicio > 0 && texto[inicio - 1] === '.') {
    afterDot = true;

    let objectEnd = inicio - 1;
    let objectStart = objectEnd;
    while (objectStart > 0 && /[\w$]/.test(texto[objectStart - 1] ?? '')) {
      objectStart--;
    }
    objectName = texto.slice(objectStart, objectEnd) || undefined;
  }

  return { prefix, from: inicio, afterDot, objectName };
}

// ===== Iconos / tipo de CodeMirror =====

function tipoCodeMirror(tipo: SuggestionType): string {
  switch (tipo) {
    case 'snippet':
      return 'snippet';
    case 'keyword':
      return 'keyword';
    case 'builtin':
      return 'class';
    case 'method':
      return 'method';
    case 'variable':
      return 'variable';
    case 'function':
      return 'function';
    case 'class':
      return 'class';
    case 'parameter':
      return 'property';
    case 'property':
      return 'property';
    case 'import':
      return 'namespace';
    default:
      return 'text';
  }
}

// ===== Conversión a Completion =====

function sugerenciaACompletion(s: Suggestion): Completion {
  const completion: Completion = {
    label: s.label,
    type: tipoCodeMirror(s.type),
  };

  // Solo mostramos detail si el tipo lo permite.
  // Los símbolos (variable, función, clase, parámetro, propiedad, import)
  // NUNCA llevan detail: el icono ya lo dice todo.
  if (!TIPOS_SIN_DETAIL.has(s.type) && s.detail) {
    completion.detail = s.detail;
  }

  // Convertir apply si tiene marcador `${}`
  if (s.apply) {
    const cursorIndex = s.apply.indexOf('${}');
    if (cursorIndex >= 0) {
      const antes = s.apply.slice(0, cursorIndex);
      const despues = s.apply.slice(cursorIndex + 3);
      completion.apply = (view, _completion, from, to) => {
        const texto = antes + despues;
        view.dispatch({
          changes: { from, to, insert: texto },
          selection: { anchor: from + antes.length },
        });
      };
    } else {
      completion.apply = s.apply;
    }
  }

  if (typeof s.boost === 'number') {
    completion.boost = s.boost;
  }

  return completion;
}

// ===== Fusionar resultados =====

function fusionar(
  listas: Suggestion[][],
  maximo: number = MAX_SUGGESTIONS
): Suggestion[] {
  const porLabel = new Map<string, Suggestion>();

  for (const lista of listas) {
    for (const s of lista) {
      const existente = porLabel.get(s.label);
      if (!existente) {
        porLabel.set(s.label, s);
        continue;
      }
      const boostA = s.boost ?? 0;
      const boostB = existente.boost ?? 0;
      if (boostA > boostB) {
        porLabel.set(s.label, s);
      }
    }
  }

  return Array.from(porLabel.values())
    .sort((a, b) => (b.boost ?? 0) - (a.boost ?? 0))
    .slice(0, maximo);
}

// ===== CompletionSource =====

export async function minicodeCompletionSource(
  context: CompletionContext
): Promise<CompletionResult | null> {
  const { prefix, from, afterDot, objectName } = detectarPrefijo(context);

  if (!afterDot && prefix.length < MIN_PREFIX_LENGTH) {
    return null;
  }

  const analisis = getServicioAnalisis();
  const resultado = analisis?.obtenerResultado() ?? null;

  const providers = obtenerProveedores('javascript');
  if (providers.length === 0) return null;

  const scope = analisis?.obtenerScopeEnPosicion(context.pos) ?? null;

  const ctx: SuggestionContext = {
    prefix,
    pos: context.pos,
    code: context.state.doc.toString(),
    analisis: resultado,
    afterDot,
    objectName,
    scopeId: scope?.id ?? null,
  };

  const listas: Suggestion[][] = [];
  for (const p of providers) {
    try {
      const sugerencias = p.suggest(ctx);
      if (sugerencias.length) listas.push(sugerencias);
    } catch (err) {
      console.error(`[suggestions] error en provider "${p.name}"`, err);
    }
  }

  const fusionadas = fusionar(listas);
  if (fusionadas.length === 0) return null;

  const options: Completion[] = fusionadas.map(sugerenciaACompletion);

  return {
    from,
    options,
    validFor: /^[\w$]*$/,
  };
}
