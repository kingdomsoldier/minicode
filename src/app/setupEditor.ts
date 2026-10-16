// minicode - creación y montaje del editor

import { createEditor } from '../editor/codemirror.js';
import * as files from '../state/files.js';

export interface EditorSetup {
  editor: ReturnType<typeof createEditor>;
  container: HTMLElement;
}

/**
 * Crea el contenedor y el editor CodeMirror.
 * El editor se conecta al estado: cualquier cambio del usuario
 * se propaga a `files.actualizarContenido`.
 */
export function setupEditor(parent: HTMLElement): EditorSetup {
  const container = document.createElement('div');
  container.className = 'editor-container';

  const editor = createEditor({
    parent: container,
    initialValue: '',
    onUpdate: (value) => {
      const active = files.getActiveFile();
      if (active) files.actualizarContenido(active.id, value);
    },
  });

  parent.appendChild(container);

  return { editor, container };
}
