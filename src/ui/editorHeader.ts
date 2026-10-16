// minicode - header fino sobre el editor
// Muestra: contador de errores (izq) + lenguaje (der) + botón de toggle

export interface EditorHeaderOptions {
  language?: string;
  errorCount?: number;
  topBarVisible?: boolean;
}

export interface EditorHeaderInstance {
  el: HTMLElement;
  update: (options: EditorHeaderOptions) => void;
  /** Registra el callback que se ejecuta al pulsar el botón de toggle. */
  setOnToggle: (fn: () => void) => void;
}

export function createEditorHeader(
  initial: EditorHeaderOptions = {}
): EditorHeaderInstance {
  const el = document.createElement('div');
  el.className = 'editor-header';

  let state: EditorHeaderOptions = {
    language: '',
    errorCount: 0,
    topBarVisible: true,
    ...initial,
  };

  let onToggle: (() => void) | null = null;

  const render = () => {
    el.innerHTML = '';

    // ===== Lado izquierdo: contador de errores =====
    const left = document.createElement('div');
    left.className = 'editor-header-left';

    if (state.errorCount && state.errorCount > 0) {
      const errorBadge = document.createElement('div');
      errorBadge.className = 'editor-header-errors';
      errorBadge.textContent = `⚠ ${state.errorCount}`;
      errorBadge.title = `${state.errorCount} error(es) de sintaxis`;
      left.appendChild(errorBadge);
    }

    el.appendChild(left);

    // ===== Lado derecho: lenguaje + botón de toggle =====
    const right = document.createElement('div');
    right.className = 'editor-header-right';

    if (state.language) {
      const lang = document.createElement('div');
      lang.className = 'editor-header-lang';
      lang.textContent = state.language.toUpperCase();
      right.appendChild(lang);
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'editor-header-toggle';
    toggleBtn.type = 'button';

    if (state.topBarVisible) {
      toggleBtn.textContent = '⌃';
      toggleBtn.title = 'Ocultar barra superior';
      toggleBtn.setAttribute('aria-label', 'Ocultar barra superior');
      toggleBtn.classList.add('is-expanded');
    } else {
      toggleBtn.textContent = '⌄';
      toggleBtn.title = 'Mostrar barra superior';
      toggleBtn.setAttribute('aria-label', 'Mostrar barra superior');
      toggleBtn.classList.add('is-collapsed');
    }

    toggleBtn.addEventListener('click', () => {
      onToggle?.();
    });

    right.appendChild(toggleBtn);
    el.appendChild(right);
  };

  render();

  const update = (options: EditorHeaderOptions) => {
    state = { ...state, ...options };
    render();
  };

  const setOnToggle = (fn: () => void) => {
    onToggle = fn;
    render();
  };

  return { el, update, setOnToggle };
}
