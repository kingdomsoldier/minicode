// minicode - detección del teclado virtual
// Ajusta el layout cuando el teclado del sistema se abre/cierra

const UMBRAL_TECLADO = 150; // px — por debajo de esto, no es teclado

export interface KeyboardState {
  visible: boolean;
  height: number;
}

export type KeyboardListener = (state: KeyboardState) => void;

let estadoActual: KeyboardState = { visible: false, height: 0 };
const listeners = new Set<KeyboardListener>();
let inicializado = false;

function notificar() {
  for (const listener of listeners) {
    listener(estadoActual);
  }
}

function calcularEstado(): KeyboardState {
  const vv = window.visualViewport;
  if (!vv) {
    return { visible: false, height: 0 };
  }

  const diff = window.innerHeight - vv.height - vv.offsetTop;
  const altura = Math.max(0, diff);

  return {
    visible: altura > UMBRAL_TECLADO,
    height: altura,
  };
}

function actualizar() {
  const nuevo = calcularEstado();

  const cambio =
    nuevo.visible !== estadoActual.visible ||
    Math.abs(nuevo.height - estadoActual.height) > 2;

  if (!cambio) return;

  estadoActual = nuevo;
  aplicarAlDOM();
  notificar();
}

function aplicarAlDOM() {
  const app = document.getElementById('app');
  if (!app) return;

  if (estadoActual.visible) {
    app.style.paddingBottom = `${estadoActual.height}px`;
    app.classList.add('keyboard-open');
  } else {
    app.style.paddingBottom = '';
    app.classList.remove('keyboard-open');
  }
}

export function inicializarDeteccionTeclado(): void {
  if (inicializado) return;
  inicializado = true;

  const vv = window.visualViewport;
  if (!vv) {
    console.warn('[keyboard] visualViewport no disponible');
    return;
  }

  vv.addEventListener('resize', actualizar);
  vv.addEventListener('scroll', actualizar);
  window.addEventListener('resize', actualizar);

  actualizar();
}

export function onKeyboardChange(listener: KeyboardListener): () => void {
  listeners.add(listener);
  listener(estadoActual);
  return () => listeners.delete(listener);
}

export function getKeyboardState(): KeyboardState {
  return estadoActual;
}
