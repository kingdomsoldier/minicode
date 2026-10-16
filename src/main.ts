// minicode - punto de entrada del frontend
import { iniciarLiveReload } from './liveReload.js';
import { inicializarDeteccionTeclado } from './ui/keyboard.js';
import * as files from './state/files.js';
import { setupUI } from './app/setupUI.js';
import { registrarProveedoresJavaScript } from './suggestions/javascript/index.js';

console.log('minicode cargado');

// Servicios globales
iniciarLiveReload();
inicializarDeteccionTeclado();

// Registro de providers de sugerencias
registrarProveedoresJavaScript();

// Estado
files.inicializarEstado();

// Montar la UI
const app = document.getElementById('app');
if (!app) throw new Error('No se encontró #app');

const { editor } = setupUI(app);
(window as any).__editor = editor;

export {};
