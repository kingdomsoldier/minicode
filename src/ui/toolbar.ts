// minicode - toolbar inferior con símbolos

const SYMBOLS = [
  '{', '}', '(', ')', '[', ']',
  '<', '>', '=', ';', ':', '"',
  "'", '`', '/', '\\', '|', '&',
  '+', '-', '*', '%', '!', '?',
  '#', '@', '_', '$',
];

export interface ToolbarOptions {
  onInsert?: (text: string) => void;
}

export interface ToolbarInstance {
  el: HTMLElement;
  update: (options: Partial<ToolbarOptions>) => void;
}

export function createToolbar(initial: ToolbarOptions = {}): ToolbarInstance {
  const el = document.createElement('footer');
  el.className = 'toolbar';

  let state: ToolbarOptions = { ...initial };

  const symbolsRow = document.createElement('div');
  symbolsRow.className = 'toolbar-symbols';

  for (const sym of SYMBOLS) {
    const btn = document.createElement('button');
    btn.className = 'toolbar-symbol';
    btn.textContent = sym;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      state.onInsert?.(sym);
    });
    symbolsRow.appendChild(btn);
  }

  el.appendChild(symbolsRow);

  const update = (options: Partial<ToolbarOptions>) => {
    state = { ...state, ...options };
  };

  return { el, update };
}
