// minicode - rutas permitidas del sistema

import { homedir } from 'node:os';
import { resolve, sep, join } from 'node:path';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';

/**
 * Directorios desde los que el usuario puede navegar.
 */
export function getSystemRoots() {
  const roots = [homedir(), '/storage/emulated/0'];
  return roots.map((r) => resolve(r));
}

/**
 * Verifica que una ruta esté dentro de alguno de los roots permitidos.
 */
export function esRutaDelSistema(absPath) {
  const ruta = resolve(absPath);
  return getSystemRoots().some(
    (root) => ruta === root || ruta.startsWith(root + sep)
  );
}

export function getHomeDir() {
  return resolve(homedir());
}

export function getStartDir() {
  return getHomeDir();
}

/**
 * Ruta de la carpeta de proyectos por defecto: ~/projects
 */
export function getProjectsDir() {
  return join(getHomeDir(), 'projects');
}

/**
 * Asegura que ~/projects existe. Si no existe, la crea.
 * Devuelve la ruta absoluta.
 * No lanza error si falla la creación (solo loguea).
 */
export function asegurarProjectsDir() {
  const dir = getProjectsDir();
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn(`[systemPaths] no se pudo crear ${dir}: ${err.message}`);
  }
  return dir;
}

/**
 * Detecta los almacenamientos disponibles.
 */
export function detectarAlmacenamientos() {
  const resultado = [];

  // Interno (Android)
  const interno = '/storage/emulated/0';
  if (existsSync(interno)) {
    resultado.push({
      name: '📱 Almacenamiento interno',
      path: interno,
    });
  }

  // Externos (UUID tipo XXXX-XXXX en /storage/)
  try {
    const entries = readdirSync('/storage/');
    for (const entry of entries) {
      if (entry === 'emulated' || entry === 'self') continue;
      if (/^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(entry)) {
        resultado.push({
          name: '💾 Almacenamiento externo',
          path: `/storage/${entry}`,
        });
      }
    }
  } catch {
    // ignorar
  }

  return resultado;
}
