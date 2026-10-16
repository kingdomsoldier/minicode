// minicode - explorador de archivos (open / saveAs / pickFolder)

import type { FileSystemProvider } from '../files/provider.js';
import { bloquearScrollBody } from './utils/overlayLock.js';

export type FileBrowserMode = 'open' | 'saveAs' | 'pickFolder';

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

export interface FileBrowserOptions {
  provider: FileSystemProvider;
  onSelect: (file: { path: string; name: string; content: string }) => void;
  onRequestItemMenu?: (item: FileEntry) => void;
}

export interface SaveAsResult {
  folder: string;
  name: string;
}

export interface FileBrowserInstance {
  el: HTMLElement;
  open: () => void;
  saveAs: (opts: { defaultName: string; startPath?: string }) => Promise<SaveAsResult | null>;
  pickDestinationFolder: (startPath?: string) => Promise<string | null>;
  refresh: () => void;
  getCurrentPath: () => string;
}

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD = 10;

export function createFileBrowser(options: FileBrowserOptions): FileBrowserInstance {
  const { provider, onSelect, onRequestItemMenu } = options;

  // ===== Estado =====
  let mode: FileBrowserMode = 'open';
  let pickFolderPurpose: 'root' | 'destination' = 'root';
  let currentPath = '.';
  let currentAbsoluteRoot = '';
  let systemPath = '';
  let saveAsName = '';

  let resolveSaveAs: ((r: SaveAsResult | null) => void) | null = null;
  let resolvePickFolder: ((r: string | null) => void) | null = null;
  let liberarScroll: (() => void) | null = null;

  // ===== Overlay + panel =====
  const overlay = document.createElement('div');
  overlay.className = 'fb-overlay';

  const panel = document.createElement('div');
  panel.className = 'fb-panel';

  // ===== Header =====
  const header = document.createElement('div');
  header.className = 'fb-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'fb-back';
  backBtn.textContent = '←';
  backBtn.type = 'button';

  const pathLabel = document.createElement('div');
  pathLabel.className = 'fb-path';

  const rootBtn = document.createElement('button');
  rootBtn.className = 'fb-root-btn';
  rootBtn.textContent = '📁';
  rootBtn.type = 'button';
  rootBtn.title = 'Cambiar directorio raíz';

  const optionsBtn = document.createElement('button');
  optionsBtn.className = 'fb-options-btn';
  optionsBtn.textContent = '⋯';
  optionsBtn.type = 'button';
  optionsBtn.title = 'Opciones';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'fb-confirm';
  confirmBtn.type = 'button';
  confirmBtn.style.display = 'none';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'fb-close';
  closeBtn.textContent = '×';
  closeBtn.type = 'button';

  header.appendChild(backBtn);
  header.appendChild(pathLabel);
  header.appendChild(rootBtn);
  header.appendChild(optionsBtn);
  header.appendChild(confirmBtn);
  header.appendChild(closeBtn);

  // ===== Panel de opciones =====
  const optionsPanel = document.createElement('div');
  optionsPanel.className = 'fb-options-panel';
  optionsPanel.style.display = 'none';

  const optNewFile = document.createElement('button');
  optNewFile.className = 'fb-option-item';
  optNewFile.type = 'button';
  optNewFile.textContent = '📄 Nuevo archivo';

  const optNewFolder = document.createElement('button');
  optNewFolder.className = 'fb-option-item';
  optNewFolder.type = 'button';
  optNewFolder.textContent = '📁 Nueva carpeta';

  optionsPanel.appendChild(optNewFile);
  optionsPanel.appendChild(optNewFolder);

  // ===== Chips =====
  const chipsRow = document.createElement('div');
  chipsRow.className = 'fb-chips';
  chipsRow.style.display = 'none';

  // ===== Input de nombre =====
  const nameRow = document.createElement('div');
  nameRow.className = 'fb-name-row';
  nameRow.style.display = 'none';

  const nameLabel = document.createElement('span');
  nameLabel.className = 'fb-name-label';
  nameLabel.textContent = 'Nombre:';

  const nameInput = document.createElement('input');
  nameInput.className = 'fb-name-input';
  nameInput.type = 'text';
  nameInput.autocomplete = 'off';
  nameInput.spellcheck = false;

  nameRow.appendChild(nameLabel);
  nameRow.appendChild(nameInput);

  // ===== Lista =====
  const listEl = document.createElement('div');
  listEl.className = 'fb-list';

  const loading = document.createElement('div');
  loading.className = 'fb-loading';
  loading.textContent = 'Cargando…';

  panel.appendChild(header);
  panel.appendChild(optionsPanel);
  panel.appendChild(chipsRow);
  panel.appendChild(nameRow);
  panel.appendChild(listEl);
  panel.appendChild(loading);
  overlay.appendChild(panel);

  // ===== Config =====
  function resetUI() {
    chipsRow.style.display = 'none';
    chipsRow.innerHTML = '';
    nameRow.style.display = 'none';
    confirmBtn.style.display = 'none';
    rootBtn.style.display = 'none';
    optionsBtn.style.display = 'none';
    optionsPanel.style.display = 'none';
    confirmBtn.textContent = '';
  }

  function configurarHeader() {
    resetUI();

    if (mode === 'open') {
      pathLabel.textContent = currentPath === '.' ? '/' : '/' + currentPath;
      rootBtn.style.display = '';
      optionsBtn.style.display = '';
      return;
    }

    if (mode === 'saveAs') {
      pathLabel.textContent = systemPath;
      confirmBtn.textContent = 'Guardar';
      confirmBtn.style.display = '';
      nameRow.style.display = '';
      nameInput.value = saveAsName;
      chipsRow.style.display = '';
      cargarChips();
      return;
    }

    if (mode === 'pickFolder') {
      pathLabel.textContent = systemPath;
      confirmBtn.textContent = pickFolderPurpose === 'root' ? '✓' : 'Elegir';
      confirmBtn.style.display = '';
      chipsRow.style.display = '';
      cargarChips();
      return;
    }
  }

  async function cargarChips() {
    try {
      const sugerencias = await provider.systemSuggestions();
      chipsRow.innerHTML = '';
      for (const s of sugerencias) {
        const chip = document.createElement('button');
        chip.className = 'fb-chip';
        chip.type = 'button';
        chip.textContent = s.label;
        chip.addEventListener('click', () => {
          systemPath = s.path;
          cargarSystem(s.path);
        });
        chipsRow.appendChild(chip);
      }
    } catch {
      chipsRow.style.display = 'none';
    }
  }

  async function cargar(path: string): Promise<void> {
    loading.style.display = 'block';
    listEl.innerHTML = '';

    try {
      const data = await provider.list(path);
      currentPath = data.path;
      pathLabel.textContent = data.path === '.' ? '/' : '/' + data.path;

      backBtn.disabled = !data.parent;
      backBtn.style.opacity = data.parent ? '1' : '0.3';

      renderItems(data.items, 'open');
    } catch (err: any) {
      mostrarError(err.message);
    } finally {
      loading.style.display = 'none';
    }
  }

  async function cargarSystem(absPath: string): Promise<void> {
    loading.style.display = 'block';
    listEl.innerHTML = '';

    try {
      const data = await provider.systemBrowse(absPath);
      systemPath = data.absolutePath;
      pathLabel.textContent = data.absolutePath;

      backBtn.disabled = !data.parent;
      backBtn.style.opacity = data.parent ? '1' : '0.3';

      renderItems(data.items, mode);
    } catch (err: any) {
      mostrarError(err.message);
    } finally {
      loading.style.display = 'none';
    }
  }

  function renderItems(items: any[], modoActual: FileBrowserMode) {
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'fb-empty';
      empty.textContent = 'Carpeta vacía';
      listEl.appendChild(empty);
      return;
    }

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'fb-item';
      btn.type = 'button';

      const icon = document.createElement('span');
      icon.className = 'fb-icon';
      icon.textContent = item.type === 'directory' ? '📁' : '📄';

      const name = document.createElement('span');
      name.className = 'fb-name';
      name.textContent = item.name;

      btn.appendChild(icon);
      btn.appendChild(name);

      const onClick = async () => {
        if (item.type === 'directory') {
          if (modoActual === 'open') cargar(item.path);
          else cargarSystem(item.path);
        } else {
          if (modoActual === 'open') {
            try {
              const file = await provider.read(item.path);
              onSelect({
                path: file.path,
                name: file.name,
                content: file.content,
              });
              cerrarTodo();
            } catch (err: any) {
              window.alert('Error al abrir: ' + err.message);
            }
          }
        }
      };

      const longPressActivo =
        modoActual === 'open' &&
        !item.isVirtual &&
        !!onRequestItemMenu;

      if (longPressActivo) {
        configurarInteraccion(btn, onClick, item);
      } else {
        btn.addEventListener('click', onClick);
        if (modoActual !== 'open') {
          btn.style.opacity = '0.4';
        }
      }

      listEl.appendChild(btn);
    }
  }

  function configurarInteraccion(
    btn: HTMLButtonElement,
    onClick: () => void | Promise<void>,
    item: any
  ): void {
    let timer: number | null = null;
    let longPressed = false;
    let didMove = false;
    let startX = 0;
    let startY = 0;

    const cancelarTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      btn.classList.remove('is-pressing');
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      longPressed = false;
      didMove = false;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;

      btn.classList.add('is-pressing');

      timer = window.setTimeout(() => {
        longPressed = true;
        timer = null;
        btn.classList.remove('is-pressing');
        if (navigator.vibrate) navigator.vibrate(30);
        onRequestItemMenu?.({
          name: item.name,
          type: item.type,
          path: item.path,
        });
      }, LONG_PRESS_MS);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        didMove = true;
        cancelarTimer();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const eraLongPress = longPressed;
      const huboMovimiento = didMove;

      cancelarTimer();
      longPressed = false;
      didMove = false;

      e.preventDefault();

      if (eraLongPress) return;
      if (huboMovimiento) return;

      onClick();
    };

    const onTouchCancel = () => {
      cancelarTimer();
      longPressed = false;
      didMove = false;
    };

    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('touchstart', onTouchStart, { passive: true });
    btn.addEventListener('touchmove', onTouchMove, { passive: true });
    btn.addEventListener('touchend', onTouchEnd);
    btn.addEventListener('touchcancel', onTouchCancel);

    btn.addEventListener('click', (e) => {
      if (e.detail === 0) return;
      onClick();
    });
  }

  function mostrarError(msg: string) {
    listEl.innerHTML = '';
    const error = document.createElement('div');
    error.className = 'fb-error';
    error.textContent = 'Error: ' + msg;
    listEl.appendChild(error);
  }

  function construirRutaEnActual(nombre: string): string {
    return currentPath === '.' ? nombre : `${currentPath}/${nombre}`;
  }

  function validarNombre(nombre: string): string | null {
    const limpio = nombre.trim();
    if (!limpio) return null;
    if (limpio.includes('/')) return null;
    if (limpio === '.' || limpio === '..') return null;
    return limpio;
  }

  async function crearArchivo(): Promise<void> {
    const nombre = window.prompt('Nombre del archivo:', 'nuevo.js');
    if (!nombre) return;

    const limpio = validarNombre(nombre);
    if (!limpio) {
      window.alert('Nombre inválido (no puede contener "/" ni estar vacío)');
      return;
    }

    const ruta = construirRutaEnActual(limpio);

    try {
      await provider.create(ruta, '');
      await cargar(currentPath);
    } catch (err: any) {
      window.alert('Error al crear archivo: ' + err.message);
    }
  }

  async function crearCarpeta(): Promise<void> {
    const nombre = window.prompt('Nombre de la carpeta:', 'nueva-carpeta');
    if (!nombre) return;

    const limpio = validarNombre(nombre);
    if (!limpio) {
      window.alert('Nombre inválido (no puede contener "/" ni estar vacío)');
      return;
    }

    const ruta = construirRutaEnActual(limpio);

    try {
      await provider.mkdir(ruta);
      await cargar(currentPath);
    } catch (err: any) {
      window.alert('Error al crear carpeta: ' + err.message);
    }
  }

  // ===== Eventos =====
  backBtn.addEventListener('click', async () => {
    optionsPanel.style.display = 'none';

    try {
      if (mode === 'open') {
        const data = await provider.list(currentPath);
        if (data.parent) cargar(data.parent);
      } else {
        const data = await provider.systemBrowse(systemPath);
        if (data.parent) cargarSystem(data.parent);
      }
    } catch {
      // ignorar
    }
  });

  rootBtn.addEventListener('click', async () => {
    optionsPanel.style.display = 'none';
    mode = 'pickFolder';
    pickFolderPurpose = 'root';
    try {
      currentAbsoluteRoot = await provider.getRootDir();
      systemPath = currentAbsoluteRoot;
      configurarHeader();
      cargarSystem(currentAbsoluteRoot);
    } catch (err: any) {
      window.alert('Error al leer root: ' + err.message);
      mode = 'open';
      configurarHeader();
    }
  });

  optionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const visible = optionsPanel.style.display !== 'none';
    optionsPanel.style.display = visible ? 'none' : '';
  });

  optNewFile.addEventListener('click', async () => {
    optionsPanel.style.display = 'none';
    await crearArchivo();
  });

  optNewFolder.addEventListener('click', async () => {
    optionsPanel.style.display = 'none';
    await crearCarpeta();
  });

  confirmBtn.addEventListener('click', async () => {
    if (mode === 'saveAs') {
      const name = nameInput.value.trim();
      if (!name) return;
      finalizarSaveAs(name);
      return;
    }
    if (mode === 'pickFolder') {
      await confirmarPickFolder();
      return;
    }
  });

  closeBtn.addEventListener('click', () => cancelar());

  overlay.addEventListener('click', (e) => {
    if (optionsPanel.style.display !== 'none') {
      optionsPanel.style.display = 'none';
      return;
    }
    if (e.target === overlay) cancelar();
  });

  listEl.addEventListener('click', () => {
    if (optionsPanel.style.display !== 'none') {
      optionsPanel.style.display = 'none';
    }
  });

  // ===== Finalización =====
  function finalizarSaveAs(name: string): void {
    const root = currentAbsoluteRoot;
    let folder = '.';

    if (root && systemPath.startsWith(root)) {
      const rel = systemPath.slice(root.length).replace(/^\/+/, '');
      folder = rel || '.';
    }

    const resultado: SaveAsResult = { folder, name };
    const resolver = resolveSaveAs;
    resolveSaveAs = null;
    cerrarTodo();
    resolver?.(resultado);
  }

  async function confirmarPickFolder(): Promise<void> {
    if (pickFolderPurpose === 'destination') {
      let relativa = systemPath;
      try {
        const root = await provider.getRootDir();
        if (systemPath.startsWith(root)) {
          relativa = systemPath.slice(root.length).replace(/^\/+/, '') || '.';
        } else {
          window.alert('La carpeta destino debe estar dentro del proyecto.');
          return;
        }
      } catch {
        // fallback
      }

      const resolver = resolvePickFolder;
      resolvePickFolder = null;
      cerrarTodo();
      resolver?.(relativa);
      return;
    }

    try {
      await provider.setRootDir(systemPath);
      mode = 'open';
      currentPath = '.';
      configurarHeader();
      await cargar('.');
    } catch (err: any) {
      window.alert('Error al cambiar root: ' + err.message);
    }
  }

  function cancelar(): void {
    if (mode === 'pickFolder') {
      if (pickFolderPurpose === 'destination') {
        const resolver = resolvePickFolder;
        resolvePickFolder = null;
        cerrarTodo();
        resolver?.(null);
        return;
      }
      mode = 'open';
      configurarHeader();
      cargar(currentPath);
      return;
    }

    const rs = resolveSaveAs;
    resolveSaveAs = null;
    cerrarTodo();
    rs?.(null);
  }

  function cerrarTodo(): void {
    overlay.classList.remove('is-visible');
    mode = 'open';
    resetUI();

    if (liberarScroll) {
      liberarScroll();
      liberarScroll = null;
    }
  }

  // ===== API pública =====
  function open(): void {
    mode = 'open';
    resetUI();
    overlay.classList.add('is-visible');
    liberarScroll = bloquearScrollBody();

    provider.getRootDir().then((r) => {
      currentAbsoluteRoot = r;
    }).catch(() => {
      currentAbsoluteRoot = '';
    });

    cargar(currentPath);
    configurarHeader();
  }

  function saveAs(opts: {
    defaultName: string;
    startPath?: string;
  }): Promise<SaveAsResult | null> {
    return new Promise(async (resolve) => {
      mode = 'saveAs';
      resetUI();
      saveAsName = opts.defaultName;
      resolveSaveAs = resolve;

      try {
        currentAbsoluteRoot = await provider.getRootDir();
      } catch {
        currentAbsoluteRoot = '';
      }

      const startAbs = opts.startPath && currentAbsoluteRoot
        ? `${currentAbsoluteRoot}/${opts.startPath === '.' ? '' : opts.startPath}`
        : currentAbsoluteRoot;

      systemPath = startAbs;
      configurarHeader();
      overlay.classList.add('is-visible');
      liberarScroll = bloquearScrollBody();
      cargarSystem(startAbs);

      setTimeout(() => nameInput.focus(), 100);
    });
  }

  function pickDestinationFolder(startPath?: string): Promise<string | null> {
    return new Promise(async (resolve) => {
      mode = 'pickFolder';
      pickFolderPurpose = 'destination';
      resetUI();
      resolvePickFolder = resolve;

      try {
        currentAbsoluteRoot = await provider.getRootDir();
      } catch {
        currentAbsoluteRoot = '';
      }

      const startAbs = startPath && currentAbsoluteRoot
        ? `${currentAbsoluteRoot}/${startPath === '.' ? '' : startPath}`
        : currentAbsoluteRoot;

      systemPath = startAbs;
      configurarHeader();
      overlay.classList.add('is-visible');
      liberarScroll = bloquearScrollBody();
      cargarSystem(startAbs);
    });
  }

  function refresh(): void {
    if (mode === 'open') cargar(currentPath);
  }

  function getCurrentPath(): string {
    return currentPath;
  }

  return { el: overlay, open, saveAs, pickDestinationFolder, refresh, getCurrentPath };
}
