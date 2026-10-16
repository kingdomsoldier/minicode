// minicode - barra de acciones superior

export interface ActionsOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onReload?: () => void;
  onRun?: () => void;
  activeDirty?: boolean;
  othersDirty?: boolean;
  hasPath?: boolean;
  ejecutando?: boolean;
}

export interface ActionsInstance {
  el: HTMLElement;
  /** Punto de inserción donde se montará el botón ⋯ */
  menuSlot: HTMLElement;
  update: (options: Partial<ActionsOptions>) => void;
}

export function createActions(initial: ActionsOptions = {}): ActionsInstance {
  const el = document.createElement('div');
  el.className = 'actions';

  let state: ActionsOptions = {
    activeDirty: false,
    othersDirty: false,
    hasPath: false,
    ejecutando: false,
    ...initial,
  };

  const btnUndo = document.createElement('button');
  btnUndo.className = 'action-btn';
  btnUndo.textContent = '↶';
  btnUndo.type = 'button';
  btnUndo.setAttribute('aria-label', 'Deshacer');
  btnUndo.addEventListener('click', () => state.onUndo?.());

  const btnRedo = document.createElement('button');
  btnRedo.className = 'action-btn';
  btnRedo.textContent = '↷';
  btnRedo.type = 'button';
  btnRedo.setAttribute('aria-label', 'Rehacer');
  btnRedo.addEventListener('click', () => state.onRedo?.());

  const btnSave = document.createElement('button');
  btnSave.className = 'action-btn action-save';
  btnSave.textContent = 'Guardar';
  btnSave.type = 'button';
  btnSave.addEventListener('click', () => state.onSave?.());

  const btnReload = document.createElement('button');
  btnReload.className = 'action-btn action-reload';
  btnReload.textContent = '↻';
  btnReload.type = 'button';
  btnReload.setAttribute('aria-label', 'Recargar desde disco');
  btnReload.title = 'Recargar desde disco';
  btnReload.style.display = 'none';
  btnReload.addEventListener('click', () => state.onReload?.());

  // Slot donde setupUI monta el actionsMenu (el ⋯ con su popup)
  const menuSlot = document.createElement('div');
  menuSlot.className = 'actions-menu-slot';

  const btnRun = document.createElement('button');
  btnRun.className = 'action-btn action-run';
  btnRun.textContent = '▶';
  btnRun.type = 'button';
  btnRun.setAttribute('aria-label', 'Ejecutar');
  btnRun.title = 'Ejecutar (Ctrl+Enter)';
  btnRun.addEventListener('click', () => {
    if (state.ejecutando) return;
    state.onRun?.();
  });

  el.appendChild(btnUndo);
  el.appendChild(btnRedo);
  el.appendChild(btnSave);
  el.appendChild(btnReload);
  el.appendChild(menuSlot);
  el.appendChild(btnRun);

  const update = (options: Partial<ActionsOptions>) => {
    state = { ...state, ...options };

    if (state.activeDirty) {
      btnSave.classList.add('is-dirty');
    } else {
      btnSave.classList.remove('is-dirty');
    }

    if (state.othersDirty) {
      btnSave.classList.add('has-others');
    } else {
      btnSave.classList.remove('has-others');
    }

    btnReload.style.display = state.hasPath ? '' : 'none';

    if (state.ejecutando) {
      btnRun.textContent = '⏳';
      btnRun.classList.add('is-running');
      btnRun.disabled = true;
    } else {
      btnRun.textContent = '▶';
      btnRun.classList.remove('is-running');
      btnRun.disabled = false;
    }
  };

  update(state);

  return { el, menuSlot, update };
}
