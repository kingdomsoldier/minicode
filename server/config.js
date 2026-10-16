// minicode - configuración persistente
// Guarda ajustes en ~/.minicode/config.json

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const CONFIG_DIR = join(homedir(), '.minicode');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

let cache = null;

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadFromDisk() {
  try {
    if (!existsSync(CONFIG_FILE)) return {};
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[config] error al leer config:', err.message);
    return {};
  }
}

function saveToDisk(config) {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Devuelve el directorio raíz actual.
 * Prioridad: config guardada > variable MINICODE_DIR > cwd
 */
export function getRootDir() {
  if (cache?.rootDir) return cache.rootDir;

  const config = loadFromDisk();
  const rootDir = config.rootDir
    ? resolve(config.rootDir)
    : resolve(process.env.MINICODE_DIR || process.cwd());

  cache = { ...cache, rootDir };
  return rootDir;
}

/**
 * Establece un nuevo directorio raíz y lo persiste.
 * No valida que exista — eso es responsabilidad del llamador.
 */
export function setRootDir(newPath) {
  const resolved = resolve(newPath);
  const config = loadFromDisk();
  config.rootDir = resolved;
  saveToDisk(config);
  cache = { ...cache, rootDir: resolved };
  return resolved;
}

/** Ruta del archivo de configuración (útil para debug). */
export function getConfigPath() {
  return CONFIG_FILE;
}
