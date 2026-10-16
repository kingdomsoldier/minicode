// minicode - registro de proveedores para JavaScript

import { registrarProveedores } from '../index.js';
import { snippetsProvider } from './snippetsProvider.js';
import { keywordsProvider } from './keywordsProvider.js';
import { symbolsProvider } from './symbolsProvider.js';
import { propertiesProvider } from './propertiesProvider.js';

/**
 * Registra todos los proveedores de JavaScript.
 * Se llama una vez al arrancar la aplicación.
 *
 * El orden importa: los de mayor prioridad van primero.
 * De todas formas, el boost interno de cada sugerencia también
 * determina el orden final en el popup.
 */
export function registrarProveedoresJavaScript(): void {
  registrarProveedores('javascript', [
    symbolsProvider,      // símbolos del archivo (variables, funciones, clases)
    propertiesProvider,   // propiedades de objetos literales del usuario
    snippetsProvider,     // plantillas de código
    keywordsProvider,     // keywords + built-ins + métodos genéricos
  ]);
}
