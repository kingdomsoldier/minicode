// minicode - popup menú de la barra de acciones

import { bloquearScrollBody } from './utils/overlayLock.js';

export interface ActionsMenuState {
  hasDirtyOnDisk: boolean;
  hasAnyOnDisk: boolean;
  hasAnyFile: boolean;
}

export interface ActionsMenuHandlers {
  onArchivos?: () => void;
  onGuardarTodo?: () => void;
  onRecargarTodo?: () => void;
  onCerrarTodo?: () => void;
  /**
   * Callback para leer el estado actual cuando el usuario pulsa el trigger.
   * Opcional: si no se pasa, se asume estado vacío.
   */
  getState?: () => ActionsMenuState;
}

export interface ActionsMenuInstance {
  el: HTMLElement;
  trigger: HTMLButtonElement;
  open: (state?: ActionsMenuState) => void;
  close: () => void;
  toggle: (state?: ActionsMenuState) => void;
  isOpen: () => boolean;
}

const ESTADO_VACIO: ActionsMenuState = {
  hasDirtyOnDisk: false,
  hasAnyOnDisk: false,
  hasAnyFile: false,
};

export function createActionsMenu(
  handlers: ActionsMenuHandlers
): ActionsMenuInstance {
  // ===== Contenedor ancla (solo el trigger vive aquí) =====
  const el = document.createElement('div');
  el.className = 'popup-menu-container';

  // ===== Botón trigger (⋯) =====
  const trigger = document.createElement('button');
  trigger.className = 'action-btn action-menu';
  trigger.type = 'button';
  trigger.textContent = '⋯';
  trigger.setAttribute('aria-label', 'Más opciones');
  trigger.title = 'Más opciones';

  // ===== Popup (montado en document.body) =====
  const popup = document.createElement('div');
  popup.className = 'popup-menu popup-menu-fixed';
  popup.style.display = 'none';

  let liberarScroll: (() => void) | null = null;

  // ===== Items =====
  function crearItem(
    icono: string,
    label: string,
    onClick: () => void,
    variante: 'default' | 'danger' = 'default'
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className =
      'popup-menu-item' + (variante === 'danger' ? ' is-danger' : '');
    btn.type = 'button';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'popup-menu-icon';
    iconSpan.textContent = icono;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;

    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      close();
      onClick();
    });

    return btn;
  }

  function separador(): HTMLElement {
    const sep = document.createElement('div');
    sep.className = 'popup-menu-separator';
    return sep;
  }

  const items = {
    archivos: crearItem('📁', 'Archivos', () => handlers.onArchivos?.()),
    guardarTodo: crearItem('💾', 'Guardar todo', () =>
      handlers.onGuardarTodo?.()
    ),
    recargarTodo: crearItem('🔄', 'Recargar todo', () =>
      handlers.onRecargarTodo?.()
    ),
    cerrarTodo: crearItem(
      '✕',
      'Cerrar todo',
      () => handlers.onCerrarTodo?.(),
      'danger'
    ),
  };

  // ===== Layout del popup =====
  popup.appendChild(items.archivos);
  popup.appendChild(separador());
  popup.appendChild(items.guardarTodo);
  popup.appendChild(items.recargarTodo);
  popup.appendChild(separador());
  popup.appendChild(items.cerrarTodo);

  el.appendChild(trigger);
  document.body.appendChild(popup);

  // ===== Control de apertura =====
  function isOpen(): boolean {
    return popup.style.display !== 'none';
  }

  function posicionarPopup(): void {
    popup.style.top = '';
    popup.style.right = '';

    const rect = trigger.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    let top = rect.bottom + 6;
    let right = window.innerWidth - rect.right;

    // Si no cabe abajo, lo colocamos arriba del trigger
    if (top + popupRect.height > window.innerHeight - 8) {
      const arriba = rect.top - popupRect.height - 6;
      if (arriba >= 8) {
        top = arriba;
      }
    }

    // Si se sale por la derecha, lo pegamos al borde
    if (right < 8) {
      right = 8;
    }

    popup.style.top = `${top}px`;
    popup.style.right = `${right}px`;
  }

  function resolverEstado(state?: ActionsMenuState): ActionsMenuState {
    if (state) return state;
    if (handlers.getState) {
      try {
        return handlers.getState();
      } catch {
        return ESTADO_VACIO;
      }
    }
    return ESTADO_VACIO;
  }

  function open(state?: ActionsMenuState): void {
    const s = resolverEstado(state);

    items.guardarTodo.disabled = !s.hasDirtyOnDisk;
    items.recargarTodo.disabled = !s.hasAnyOnDisk;
    items.cerrarTodo.disabled = !s.hasAnyFile;

    popup.style.display = '';
    // Posicionar después de mostrarlo para poder medirlo
    posicionarPopup();

    if (!liberarScroll) {
      liberarScroll = bloquearScrollBody();
    }
  }

  function close(): void {
    popup.style.display = 'none';
    if (liberarScroll) {
      liberarScroll();
      liberarScroll = null;
    }
  }

  function toggle(state?: ActionsMenuState): void {
    if (isOpen()) close();
    else open(state);
  }

  // ===== Click en el trigger =====
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  // ===== Cerrar al pulsar fuera =====
  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    const target = e.target as Node;
    if (el.contains(target) || popup.contains(target)) return;
    close();
  });

  // ===== Cerrar al pulsar Escape =====
  document.addEventListener('keydown', (e) => {
    if (isOpen() && e.key === 'Escape') close();
  });

  // ===== Reposicionar al hacer scroll o resize =====
  window.addEventListener(
    'resize',
    () => {
      if (isOpen()) posicionarPopup();
    },
    { passive: true }
  );
  window.addEventListener(
    'scroll',
    () => {
      if (isOpen()) posicionarPopup();
    },
    { passive: true, capture: true }
  );

  return { el, trigger, open, close, toggle, isOpen };
}
