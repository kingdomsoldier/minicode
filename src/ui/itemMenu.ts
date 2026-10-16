// minicode - menú de acciones por item (archivo o carpeta)

import { bloquearScrollBody } from './utils/overlayLock.js';

export interface ItemMenuOptions {
  onRename?: () => void;
  onCopy?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
}

export interface ItemMenuOpenOptions {
  itemName: string;
  itemType: 'file' | 'directory';
}

export interface ItemMenuInstance {
  el: HTMLElement;
  open: (options: ItemMenuOpenOptions) => void;
  close: () => void;
}

export function createItemMenu(options: ItemMenuOptions): ItemMenuInstance {
  const overlay = document.createElement('div');
  overlay.className = 'tm-overlay';

  const panel = document.createElement('div');
  panel.className = 'tm-panel';

  const header = document.createElement('div');
  header.className = 'tm-header';

  const title = document.createElement('div');
  title.className = 'tm-title';
  header.appendChild(title);

  panel.appendChild(header);

  const listEl = document.createElement('div');
  listEl.className = 'tm-list';
  panel.appendChild(listEl);

  overlay.appendChild(panel);

  let liberarScroll: (() => void) | null = null;

  let current: ItemMenuOpenOptions = {
    itemName: '',
    itemType: 'file',
  };

  function close(): void {
    overlay.classList.remove('is-visible');
    if (liberarScroll) {
      liberarScroll();
      liberarScroll = null;
    }
  }

  function crearItem(
    label: string,
    onClick: () => void,
    variante: 'default' | 'danger' = 'default'
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'tm-item' + (variante === 'danger' ? ' is-danger' : '');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      close();
      onClick();
    });
    return btn;
  }

  function render(): void {
    listEl.innerHTML = '';

    const prefijo = current.itemType === 'directory' ? '📁 ' : '📄 ';
    title.textContent = prefijo + current.itemName;

    listEl.appendChild(crearItem('Renombrar', () => options.onRename?.()));
    listEl.appendChild(crearItem('Copiar', () => options.onCopy?.()));
    listEl.appendChild(crearItem('Mover', () => options.onMove?.()));
    listEl.appendChild(
      crearItem('Eliminar', () => options.onDelete?.(), 'danger')
    );

    const cancelar = document.createElement('button');
    cancelar.className = 'tm-cancel';
    cancelar.type = 'button';
    cancelar.textContent = 'Cancelar';
    cancelar.addEventListener('click', () => close());
    listEl.appendChild(cancelar);
  }

  function open(opts: ItemMenuOpenOptions): void {
    current = opts;
    render();
    overlay.classList.add('is-visible');
    liberarScroll = bloquearScrollBody();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return { el: overlay, open, close };
}
