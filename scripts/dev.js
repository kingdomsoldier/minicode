// minicode - orquestador de desarrollo
// Arranca en paralelo:
//   1. Rollup en watch (recompila bundle.js)
//   2. Servidor con reinicio automático
//   3. Watcher del CSS (recompila public/styles.css cuando cambia cualquier .css)

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import chokidar from 'chokidar';
import { compilarCss } from './lib/compileCss.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

const procesos = [];
let cerrando = false;

function lanzar(nombre, comando, args, color) {
  const prefix = `${color}[${nombre}]${C.reset} `;

  const proc = spawn(comando, args, {
    cwd: ROOT,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', (data) => {
    const lineas = data.toString().split('\n').filter(Boolean);
    for (const l of lineas) console.log(prefix + l);
  });

  proc.stderr.on('data', (data) => {
    const lineas = data.toString().split('\n').filter(Boolean);
    for (const l of lineas) console.error(prefix + C.red + l + C.reset);
  });

  proc.on('exit', (code) => {
    if (!cerrando && code !== 0 && code !== null) {
      console.error(`${prefix}${C.red}proceso terminó con código ${code}${C.reset}`);
    }
  });

  procesos.push({ nombre, proc });
  return proc;
}

function cerrarTodo(signal = 'SIGINT') {
  if (cerrando) return;
  cerrando = true;
  console.log(`\n${C.dim}🛑 Deteniendo procesos...${C.reset}`);

  for (const { proc } of procesos) {
    try {
      proc.kill(signal);
    } catch (_) {
      // ignorar
    }
  }

  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', () => cerrarTodo('SIGINT'));
process.on('SIGTERM', () => cerrarTodo('SIGTERM'));

console.log(`
${C.green}╔══════════════════════════════════════════╗
║         minicode — modo desarrollo        ║
╚══════════════════════════════════════════╝${C.reset}
`);

// ===== 1. Rollup en watch =====
lanzar('js  ', 'npx', ['rollup', '-c', '-w'], C.cyan);

// ===== 2. Servidor con reinicio automático =====
lanzar('srv ', 'node', ['--watch', 'server/index.js'], C.green);

// ===== 3. Watcher del CSS =====
const stylesDir = join(ROOT, 'src', 'styles');

function recompilarCss() {
  try {
    const total = compilarCss();
    console.log(`${C.yellow}[css ]${C.reset} CSS compilado (${total} archivos)`);
  } catch (err) {
    console.error(`${C.yellow}[css ]${C.reset}${C.red} error: ${err.message}${C.reset}`);
  }
}

// Compilación inicial
recompilarCss();

// Vigilar cambios en cualquier .css
const cssWatcher = chokidar.watch(stylesDir, {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50,
  },
});

cssWatcher.on('change', recompilarCss);
cssWatcher.on('add', recompilarCss);
cssWatcher.on('unlink', recompilarCss);

procesos.push({
  nombre: 'css ',
  proc: { kill: () => cssWatcher.close() },
});

console.log(`${C.dim}Presiona Ctrl+C para detener todo.${C.reset}\n`);
