// minicode - pestañas de archivos

export interface TabData {
  id: string;
  name: string;
  dirty?: boolean;
  onDisk?: boolean;
}

export interface TabsOptions {
  tabs?: TabData[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onClose?: (id: string) => void;
  onNew?: () => void;
}

export interface TabsInstance {
  el: HTMLElement;
  update: (options: TabsOptions) => void;
}

export function createTabs(initial: TabsOptions = {}): TabsInstance {
  const el = document.createElement('nav');
  el.className = 'tabs';

  let state: TabsOptions = {
    tabs: [],
    activeId: undefined,
    ...initial,
  };

  const render = () => {
    el.innerHTML = '';

    const tabs = state.tabs ?? [];

    for (const tab of tabs) {
      const tabEl = document.createElement('div');
      tabEl.className = 'tab' + (tab.id === state.activeId ? ' is-active' : '');
      tabEl.dataset.id = tab.id;

      const nameEl = document.createElement('span');
      nameEl.className = 'tab-name';
      nameEl.textContent = tab.name;
      tabEl.appendChild(nameEl);

      if (tab.dirty) {
        const dot = document.createElement('span');
        dot.className = 'tab-dot';
        dot.textContent = '●';
        dot.title = 'Cambios sin guardar';
        tabEl.appendChild(dot);
      } else if (!tab.onDisk) {
        const memDot = document.createElement('span');
        memDot.className = 'tab-memory';
        memDot.textContent = '•';
        memDot.title = 'Solo en memoria (sin guardar en disco)';
        tabEl.appendChild(memDot);
      }

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.textContent = '×';
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.onClose?.(tab.id);
      });
      tabEl.appendChild(closeBtn);

      tabEl.addEventListener('click', () => state.onSelect?.(tab.id));
      el.appendChild(tabEl);
    }

    // Botón "+" para nuevo archivo
    const newBtn = document.createElement('button');
    newBtn.className = 'tabs-new';
    newBtn.textContent = '+';
    newBtn.type = 'button';
    newBtn.setAttribute('aria-label', 'Nuevo archivo');
    newBtn.addEventListener('click', () => state.onNew?.());
    el.appendChild(newBtn);
  };

  const update = (options: TabsOptions) => {
    state = { ...state, ...options };
    render();
  };

  render();

  return { el, update };
}
