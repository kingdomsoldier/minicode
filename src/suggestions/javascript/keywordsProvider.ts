// minicode - proveedor de keywords, built-ins y métodos genéricos

import { KEYWORDS } from './keywords.js';
import { BUILTINS } from './builtins.js';
import { METHODS } from './methods.js';
import type {
  Suggestion,
  SuggestionContext,
  SuggestionProvider,
} from '../types.js';

// ===== Helpers =====

function coincidePorPrefijo(texto: string, prefijo: string): boolean {
  if (!prefijo) return false;
  return texto.toLowerCase().startsWith(prefijo.toLowerCase());
}

/**
 * Devuelve qué categoría de objeto es probablemente el que está antes
 * del punto, basándose en heurísticas por nombre.
 */
function inferirContextoDeObjeto(
  objectName: string | undefined
): ('array' | 'string' | 'object' | 'promise' | 'console' | 'json' | 'number') | null {
  if (!objectName) return null;

  const nombre = objectName.toLowerCase();

  // ===== Casos concretos =====
  if (nombre === 'console') return 'console';
  if (nombre === 'json') return 'json';
  if (nombre === 'math') return 'number';

  // ===== Heurísticas por sufijo/contiene =====

  // Arrays
  if (
    nombre.endsWith('s') ||
    nombre.includes('arr') ||
    nombre.includes('list') ||
    nombre === 'items' ||
    nombre === 'elementos'
  ) {
    return 'array';
  }

  // Strings
  if (
    nombre.includes('str') ||
    nombre.includes('text') ||
    nombre.includes('name') ||
    nombre.includes('nombre') ||
    nombre === 'msg' ||
    nombre === 'message'
  ) {
    return 'string';
  }

  // Promesas
  if (nombre.includes('promise') || nombre.includes('promesa')) {
    return 'promise';
  }

  return null;
}

/**
 * ¿El análisis conoce este objeto como un valor con propiedades reales?
 * Si sí, el propertiesProvider ya se encargará de sugerir sus propiedades,
 * y este provider debe ceder para no inundar de métodos genéricos.
 *
 * Nota: solo cedemos cuando hay propiedades REALES (objetos literales,
 * instancias de clase). Si es un array vacío o una función sin propiedades,
 * seguimos ofreciendo métodos genéricos porque son útiles.
 */
function tienePropsConocidas(ctx: SuggestionContext): boolean {
  if (!ctx.analisis || !ctx.objectName) return false;

  const raiz = ctx.objectName.split('.')[0];
  if (!raiz) return false;

  return ctx.analisis.objects.some(
    (o) => o.variableName === raiz && o.properties.length > 0
  );
}

// ===== Proveedor =====

export const keywordsProvider: SuggestionProvider = {
  name: 'javascript-keywords-builtins-methods',

  suggest(ctx: SuggestionContext): Suggestion[] {
    const { prefix, afterDot, objectName } = ctx;

    // ===== Después de un punto: solo métodos contextuales =====
    if (afterDot) {
      // Si el usuario tiene un objeto con propiedades conocidas, cedemos.
      if (tienePropsConocidas(ctx)) {
        return [];
      }

      const contextoObj = inferirContextoDeObjeto(objectName);
      const sugerencias: Suggestion[] = [];

      for (const m of METHODS) {
        if (m.contexts) {
          if (contextoObj && !m.contexts.includes(contextoObj)) continue;
          if (!contextoObj) continue;
        }

        if (prefix && !coincidePorPrefijo(m.name, prefix)) continue;

        sugerencias.push({
          label: m.name,
          detail: m.detail,
          type: 'method',
          boost: 5,
        });
      }

      // Si nada coincide por prefijo pero conocemos el contexto,
      // mostramos todos los métodos disponibles del contexto.
      if (sugerencias.length === 0 && contextoObj) {
        for (const m of METHODS) {
          if (m.contexts && !m.contexts.includes(contextoObj)) continue;
          sugerencias.push({
            label: m.name,
            detail: m.detail,
            type: 'method',
            boost: 3,
          });
        }
      }

      return sugerencias;
    }

    // ===== Sin punto: keywords + built-ins =====
    if (!prefix) return [];

    const sugerencias: Suggestion[] = [];

    // Keywords
    for (const kw of KEYWORDS) {
      if (!coincidePorPrefijo(kw, prefix)) continue;
      sugerencias.push({
        label: kw,
        detail: 'palabra clave',
        type: 'keyword',
        boost: 5,
      });
    }

    // Built-ins
    for (const b of BUILTINS) {
      if (!coincidePorPrefijo(b.name, prefix)) continue;
      sugerencias.push({
        label: b.name,
        detail: b.detail,
        type: 'builtin',
        boost: 4,
      });
    }

    return sugerencias;
  },
};
