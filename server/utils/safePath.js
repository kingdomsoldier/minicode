// minicode - validación de rutas seguras
// Todas las operaciones de archivos se validan contra un directorio raíz

import { resolve, normalize, sep } from 'node:path';

/**
 * Valida que una ruta relativa resuelva dentro del directorio raíz.
 * Lanza un error si intenta salir (ej: "../../etc/passwd").
 *
 * @param {string} rootDir - Directorio raíz (absoluto)
 * @param {string} userPath - Ruta proporcionada por el usuario
 * @returns {string} - Ruta absoluta validada
 */
export function resolverRutaSegura(rootDir, userPath) {
  if (typeof userPath !== 'string' || userPath.length === 0) {
    throw new Error('Ruta vacía');
  }

  // Normalizar el root
  const root = resolve(rootDir);

  // Normalizar y resolver la ruta del usuario
  // Si es relativa, se resuelve contra el root
  const rutaResuelta = resolve(root, userPath);
  const rutaNormalizada = normalize(rutaResuelta);

  // Verificar que sigue dentro del root
  const dentro = rutaNormalizada === root || rutaNormalizada.startsWith(root + sep);

  if (!dentro) {
    throw new Error('Ruta fuera del directorio permitido');
  }

  return rutaNormalizada;
}

/**
 * Convierte una ruta absoluta en una ruta relativa al root.
 * Útil para mostrar rutas "limpias" al frontend.
 *
 * @param {string} rootDir - Directorio raíz (absoluto)
 * @param {string} absPath - Ruta absoluta
 * @returns {string} - Ruta relativa al root (o "." si es la raíz)
 */
export function rutaRelativa(rootDir, absPath) {
  const root = resolve(rootDir);
  const abs = resolve(absPath);

  if (abs === root) return '.';
  if (abs.startsWith(root + sep)) {
    return abs.slice(root.length + 1);
  }
  return abs;
}
