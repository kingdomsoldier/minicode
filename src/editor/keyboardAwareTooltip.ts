// minicode - sincroniza una clase CSS en el editor cuando el teclado
// virtual está abierto, para que el popup de autocompletado se coloque bien

import type { EditorView } from '@codemirror/view';

const UMBRAL = 150;

/**
 * Observa `visualViewport` y añade/quita la clase `cm-keyboard-open`
 * al DOM del editor cuando el teclado virtual cambia de estado.
 *
 * Devuelve una función de limpieza para desuscribir los listeners.
 */
export function syncKeyboardClassToEditor(view: EditorView): () => void {
  const actualizar = () => {
    const vv = window.visualViewport;
    if (!vv) return;

    const altoTeclado = window.innerHeight - vv.height - vv.offsetTop;
    const abierto = altoTeclado > UMBRAL;

    if (abierto) {
      view.dom.classList.add('cm-keyboard-open');
    } else {
      view.dom.classList.remove('cm-keyboard-open');
    }
  };

  actualizar();

  const vv = window.visualViewport;
  vv?.addEventListener('resize', actualizar);
  vv?.addEventListener('scroll', actualizar);
  window.addEventListener('resize', actualizar);

  return () => {
    vv?.removeEventListener('resize', actualizar);
    vv?.removeEventListener('scroll', actualizar);
    window.removeEventListener('resize', actualizar);
  };
}
