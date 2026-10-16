// minicode - servidor principal
import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { activarLiveReload } from './liveReload.js';
import { crearRouterArchivos } from './api/files.js';
import { crearRouterConfig } from './api/config.js';
import { crearRouterSystem } from './api/system.js';
import { getRootDir, getConfigPath, setRootDir } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parsea un puerto desde un string o número.
 * Devuelve null si no es válido.
 */
function parsePort(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0 || n >= 65536) return null;
  return n;
}

/**
 * Arranca el servidor de minicode.
 *
 * @param {object} [opciones]
 * @param {number} [opciones.port]     - Puerto (default: env.MINICODE_PORT o 3000)
 * @param {string} [opciones.host]     - Host (default: env.MINICODE_HOST o 127.0.0.1)
 * @param {string} [opciones.rootDir]  - Directorio raíz para archivos (default: env.MINICODE_DIR o cwd)
 * @param {boolean} [opciones.dev]     - Modo desarrollo (default: NODE_ENV !== 'production')
 * @returns {Promise<{ url: string, cerrar: () => Promise<void> }>}
 */
export async function iniciarServidor(opciones = {}) {
  const PORT =
    parsePort(opciones.port) ??
    parsePort(process.env.MINICODE_PORT) ??
    3000;

  const HOST = opciones.host ?? process.env.MINICODE_HOST ?? '127.0.0.1';

  const DEV =
    opciones.dev !== undefined
      ? opciones.dev
      : process.env.NODE_ENV !== 'production';

  // Si se pasó un directorio raíz explícito, lo aplicamos a la config
  // (persiste en ~/.minicode/config.json)
  if (opciones.rootDir) {
    const abs = resolve(opciones.rootDir);
    setRootDir(abs);
  }

  const app = express();

  app.use(express.json({ limit: '1mb' }));

  // ===== APIs =====
  app.use('/api/config', crearRouterConfig());
  app.use('/api/files', crearRouterArchivos(getRootDir));
  app.use('/api/system', crearRouterSystem());

  app.get('/api/ping', (req, res) => {
    res.json({
      ok: true,
      message: 'pong',
      timestamp: Date.now(),
      node: process.version,
      cwd: process.cwd(),
      rootDir: getRootDir(),
      dev: DEV,
    });
  });

  // ===== Estáticos =====
  const publicDir = join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // ===== Servidor HTTP =====
  const httpServer = createServer(app);

  // ===== Live reload (solo en dev) =====
  let liveReload = null;
  if (DEV) {
    liveReload = activarLiveReload(httpServer, { watchDir: publicDir });
  }

  // ===== Arrancar =====
  await new Promise((resolvePromise, rejectPromise) => {
    httpServer.once('error', rejectPromise);
    httpServer.listen(PORT, HOST, () => {
      httpServer.removeListener('error', rejectPromise);
      resolvePromise();
    });
  });

  const url = `http://${HOST}:${PORT}`;

  console.log(`🚀 minicode corriendo en ${url}`);
  console.log(`📁 Sirviendo estáticos desde: ${publicDir}`);
  console.log(`🗂️  Directorio raíz: ${getRootDir()}`);
  console.log(`⚙️  Config: ${getConfigPath()}`);
  console.log(`🔧 Node: ${process.version}`);
  console.log(`🌍 Modo: ${DEV ? 'desarrollo' : 'producción'}`);

  // ===== Cierre limpio =====
  const cerrar = () => {
    return new Promise((resolveClose) => {
      liveReload?.close();
      httpServer.close(() => resolveClose());
    });
  };

  return { url, cerrar };
}

// ===== Ejecución directa =====
// Si este archivo se ejecuta directamente con `node server/index.js`,
// arrancamos el servidor. Si se importa (por ejemplo desde el CLI),
// solo exportamos la función.
const esEjecucionDirecta =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (esEjecucionDirecta) {
  iniciarServidor().catch((err) => {
    console.error('❌ Error al arrancar el servidor:', err.message);
    process.exit(1);
  });

  const cerrarAlSalir = async () => {
    console.log('\n🛑 Cerrando servidor...');
    process.exit(0);
  };
  process.on('SIGINT', cerrarAlSalir);
  process.on('SIGTERM', cerrarAlSalir);
}
