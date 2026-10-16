// minicode - registro de proveedores de sugerencias por lenguaje

import type { LanguageSuggestionConfig, SuggestionProvider } from './types.js';

// ===== Registro global =====

const registro = new Map<string, LanguageSuggestionConfig>();

/**
 * Registra un proveedor para un lenguaje concreto.
 * Los proveedores se acumulan; el orden de registro determina la prioridad.
 */
export function registrarProveedor(
  language: string,
  provider: SuggestionProvider
): void {
  const actual = registro.get(language);
  if (actual) {
    actual.providers.push(provider);
  } else {
    registro.set(language, {
      language,
      providers: [provider],
    });
  }
}

/**
 * Devuelve los proveedores registrados para un lenguaje.
 * Vacío si no hay ninguno.
 */
export function obtenerProveedores(language: string): SuggestionProvider[] {
  return registro.get(language)?.providers ?? [];
}

/**
 * Registra todos los proveedores de un lenguaje de una vez.
 * Útil para la configuración inicial.
 */
export function registrarProveedores(
  language: string,
  providers: SuggestionProvider[]
): void {
  for (const p of providers) {
    registrarProveedor(language, p);
  }
}

/**
 * Devuelve la lista de lenguajes registrados.
 */
export function lenguajesRegistrados(): string[] {
  return Array.from(registro.keys());
}
