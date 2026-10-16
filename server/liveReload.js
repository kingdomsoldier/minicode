// minicode - sistema de live reload para desarrollo
// Vigila public/ y notifica al navegador por WebSocket cuando algo cambia

import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';

const RELOAD_DELAY = 150; // ms de espera para agrupar cambios rápidos

/**
 * Activa el live reload enganchándose a un servidor HTTP existente.
 *
 * @param {import('http').Server} httpServer - Servidor HTTP de Express
 * @param {object} options
 * @param {string} options.watchDir - Directorio a vigilar (por defecto public/)
 * @returns {{ close: () => void }}
 */
export function activarLiveReload(httpServer, { watchDir }) {
  const wss = new WebSocketServer({ server: httpServer });

  const clientes = new Set();
  let timeout = null;

  wss.on('connection', (ws) => {
    clientes.add(ws);
    ws.on('close', () => clientes.delete(ws));
    ws.on('error', () => clientes.delete(ws));
  });

  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  const notificar = (evento, archivo) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const ruta = archivo.replace(watchDir, '').replace(/^\//, '');
      console.log(`🔄 [live reload] ${evento}: ${ruta}`);

      for (const ws of clientes) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'reload', file: ruta }));
        }
      }
    }, RELOAD_DELAY);
  };

  watcher.on('change', (f) => notificar('change', f));
  watcher.on('add', (f) => notificar('add', f));
  watcher.on('unlink', (f) => notificar('unlink', f));

  console.log(`👀 Live reload activo, vigilando: ${watchDir}`);

  return {
    close: () => {
      watcher.close();
      wss.close();
    },
  };
}
