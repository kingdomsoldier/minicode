// minicode - compilación del CSS (concatena archivos en orden)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const STYLES_DIR = join(ROOT, 'src', 'styles');
const OUTPUT = join(ROOT, 'public', 'styles.css');

const ORDEN = [
  'base.css',
  'actions.css',
  'tabs.css',
  'editor.css',
  'editor-header.css',
  'autocomplete.css',
  'empty-state.css',
  'output.css',
  'toolbar.css',
  'popup-menu.css',
  'file-browser.css',
  'menus.css',
];

export function compilarCss() {
  const partes = [];

  for (const archivo of ORDEN) {
    const ruta = join(STYLES_DIR, archivo);
    try {
      const contenido = readFileSync(ruta, 'utf8');
      partes.push(
        `/* ==========================================================\n` +
        `   ${archivo}\n` +
        `   ==========================================================\n` +
        `*/\n` +
        `${contenido.trim()}\n`
      );
    } catch (err) {
      console.warn(`⚠️  No se pudo leer ${archivo}: ${err.message}`);
    }
  }

  writeFileSync(OUTPUT, partes.join('\n'), 'utf8');
  return ORDEN.length;
}
