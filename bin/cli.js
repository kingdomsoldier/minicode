#!/usr/bin/env node
// minicode - punto de entrada CLI
// Uso: minicode [opciones]
//
// Opciones:
//   -p, --port N       Puerto del servidor (default: 3000)
//   -H, --host HOST    Host de escucha (default: 127.0.0.1)
//   -d, --dir RUTA     Directorio raíz para archivos (persiste en ~/.minicode/config.json)
//       --no-open      No abrir el navegador automáticamente
//       --dev          Modo desarrollo (activa live reload)
//   -h, --help         Mostrar ayuda
//   -v, --version      Mostrar versión

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===== Leer versión del package.json =====
const pkgPath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

// ===== Colores ANSI =====
const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// ===== Parser de argumentos =====

const HELP = `
${C.bold}minicode${C.reset} v${pkg.version} — editor de código móvil-first

${C.bold}USO${C.reset}
  ${C.cyan}minicode${C.reset} [opciones]

${C.bold}OPCIONES${C.reset}
  ${C.cyan}-p, --port N${C.reset}       Puerto del servidor ${C.gray}(default: 3000)${C.reset}
  ${C.cyan}-H, --host HOST${C.reset}    Host de escucha ${C.gray}(default: 127.0.0.1)${C.reset}
  ${C.cyan}-d, --dir RUTA${C.reset}     Directorio raíz ${C.gray}(persiste en la config)${C.reset}
  ${C.cyan}    --no-open${C.reset}      No abrir el navegador automáticamente
  ${C.cyan}    --dev${C.reset}          Modo desarrollo ${C.gray}(live reload)${C.reset}
  ${C.cyan}-h, --help${C.reset}         Mostrar esta ayuda
  ${C.cyan}-v, --version${C.reset}      Mostrar versión

${C.bold}EJEMPLOS${C.reset}
  ${C.gray}$ ${C.reset}minicode
  ${C.gray}$ ${C.reset}minicode --dir ~/proyectos
  ${C.gray}$ ${C.reset}minicode -p 3030 --dev
  ${C.gray}$ ${C.reset}minicode --no-open
`;

/**
 * Parsea los argumentos de la línea de comandos.
 * Devuelve un objeto con las opciones o lanza un error.
 */
function parseArgs(argv) {
  const opciones = {
    port: null,
    host: null,
    dir: null,
    open: true,
    dev: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '-p':
      case '--port': {
        const valor = argv[++i];
        if (!valor) throw new Error(`Falta el valor de ${arg}`);
        const n = Number(valor);
        if (!Number.isFinite(n) || n <= 0 || n >= 65536) {
          throw new Error(`Puerto inválido: "${valor}" (debe ser 1-65535)`);
        }
        opciones.port = n;
        break;
      }

      case '-H':
      case '--host': {
        const valor = argv[++i];
        if (!valor) throw new Error(`Falta el valor de ${arg}`);
        opciones.host = valor;
        break;
      }

      case '-d':
      case '--dir': {
        const valor = argv[++i];
        if (!valor) throw new Error(`Falta el valor de ${arg}`);
        opciones.dir = valor;
        break;
      }

      case '--no-open':
        opciones.open = false;
        break;

      case '--dev':
        opciones.dev = true;
        break;

      case '-h':
      case '--help':
        opciones.help = true;
        break;

      case '-v':
      case '--version':
        opciones.version = true;
        break;

      default:
        throw new Error(`Opción desconocida: "${arg}"`);
    }
  }

  return opciones;
}

// ===== Validación de directorio =====

function validarDirectorio(ruta) {
  const abs = resolve(ruta);

  if (!existsSync(abs)) {
    throw new Error(`El directorio no existe: ${abs}`);
  }

  const stat = statSync(abs);
  if (!stat.isDirectory()) {
    throw new Error(`La ruta no es un directorio: ${abs}`);
  }

  return abs;
}

// ===== Abrir el navegador =====

async function abrirNavegador(url) {
  try {
    const { default: open } = await import('open');
    await open(url);
  } catch (err) {
    // Fallback: intentar con termux-open-url si estamos en Termux
    if (process.env.PREFIX && process.env.PREFIX.includes('com.termux')) {
      try {
        const proc = spawn('termux-open-url', [url], {
          stdio: 'ignore',
          detached: true,
        });
        proc.unref();
        return;
      } catch {
        // silencio, mostramos solo el mensaje
      }
    }

    // Último recurso: avisar al usuario
    console.log(
      `${C.yellow}⚠ No se pudo abrir el navegador automáticamente.${C.reset}`
    );
    console.log(`${C.gray}  Abre manualmente: ${url}${C.reset}`);
  }
}

// ===== Acción principal =====

async function main() {
  let opciones;

  try {
    opciones = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${C.red}✕ ${err.message}${C.reset}`);
    console.error(`${C.gray}Usa "minicode --help" para ver las opciones.${C.reset}`);
    process.exit(1);
  }

  // Ayuda y versión cortan antes de cualquier otra cosa
  if (opciones.help) {
    console.log(HELP);
    process.exit(0);
  }
  if (opciones.version) {
    console.log(pkg.version);
    process.exit(0);
  }

  // Validar directorio si se pasó
  let rootDir = null;
  if (opciones.dir) {
    try {
      rootDir = validarDirectorio(opciones.dir);
    } catch (err) {
      console.error(`${C.red}✕ ${err.message}${C.reset}`);
      process.exit(1);
    }
  }

  // Aplicar opciones al entorno antes de importar el servidor
  if (opciones.port) process.env.MINICODE_PORT = String(opciones.port);
  if (opciones.host) process.env.MINICODE_HOST = opciones.host;
  if (opciones.dev) process.env.NODE_ENV = 'development';
  // Nota: el rootDir se pasa directo a `iniciarServidor`, no por env var,
  // para no ensuciar el entorno si hay subprocesos.

  // Banner
  console.log('');
  console.log(`${C.green}${C.bold}  minicode ${C.reset}${C.gray}v${pkg.version}${C.reset}`);
  console.log('');

  // Importar el servidor y arrancarlo
  const { iniciarServidor } = await import('../server/index.js');

  let servidor;
  try {
    servidor = await iniciarServidor({
      port: opciones.port ?? undefined,
      host: opciones.host ?? undefined,
      rootDir: rootDir ?? undefined,
      dev: opciones.dev,
    });
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `${C.red}✕ El puerto ${opciones.port ?? 3000} ya está en uso.${C.reset}`
      );
      console.error(
        `${C.gray}  Prueba con otro: minicode --port 3030${C.reset}`
      );
    } else if (err.code === 'EACCES') {
      console.error(
        `${C.red}✕ Sin permisos para usar el puerto ${opciones.port ?? 3000}.${C.reset}`
      );
    } else {
      console.error(`${C.red}✕ Error al arrancar el servidor:${C.reset}`);
      console.error(`${C.gray}  ${err.message}${C.reset}`);
    }
    process.exit(1);
  }

  console.log('');

  // Abrir el navegador (a menos que --no-open)
  if (opciones.open) {
    abrirNavegador(servidor.url);
  } else {
    console.log(`${C.gray}Abre la URL manualmente: ${C.reset}${servidor.url}`);
  }

  console.log('');
  console.log(`${C.dim}Presiona Ctrl+C para detener el servidor.${C.reset}`);
  console.log('');

  // Cierre limpio
  const cerrar = async () => {
    console.log(`\n${C.dim}🛑 Cerrando minicode...${C.reset}`);
    try {
      await servidor.cerrar();
    } catch {
      // ignorar
    }
    process.exit(0);
  };

  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

// ===== Ejecutar =====
main().catch((err) => {
  console.error(`${C.red}✕ Error inesperado:${C.reset}`);
  console.error(`${C.gray}  ${err.stack ?? err.message}${C.reset}`);
  process.exit(1);
});
