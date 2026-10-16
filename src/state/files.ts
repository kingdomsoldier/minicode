// minicode - gestión de archivos en memoria con persistencia

export interface FileData {
  id: string;
  name: string;
  language: string;
  content: string;
  dirty: boolean;
  /** Ruta en disco (relativa al root) si el archivo está vinculado. */
  path?: string;
}

export interface FilesState {
  files: FileData[];
  activeId: string | null;
}

type Listener = (state: FilesState) => void;

const STORAGE_KEY = 'minicode:files';
const STORAGE_VERSION = 3;

const listeners = new Set<Listener>();
let state: FilesState = { files: [], activeId: null };
let timeoutGuardado: number | null = null;

// ===== Utilidades =====

function generarId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function inferirLenguaje(nombre: string): string {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? '';
  const mapa: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'javascript',
    tsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    html: 'html',
    htm: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
  };
  return mapa[ext] ?? 'plain';
}

function nombreUnico(base: string): string {
  const existentes = new Set(state.files.map((f) => f.name));
  if (!existentes.has(base)) return base;

  const punto = base.lastIndexOf('.');
  const prefijo = punto > 0 ? base.slice(0, punto) : base;
  const ext = punto > 0 ? base.slice(punto) : '';

  let n = 2;
  while (existentes.has(`${prefijo}-${n}${ext}`)) n++;
  return `${prefijo}-${n}${ext}`;
}

// ===== Persistencia =====

function guardarEnStorage(): void {
  try {
    const payload = { v: STORAGE_VERSION, state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[files] no se pudo guardar en localStorage', err);
  }
}

function programarGuardado(): void {
  if (timeoutGuardado !== null) clearTimeout(timeoutGuardado);
  timeoutGuardado = window.setTimeout(() => {
    guardarEnStorage();
    timeoutGuardado = null;
  }, 500);
}

function cargarDeStorage(): FilesState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== STORAGE_VERSION) return null;
    if (!parsed.state || !Array.isArray(parsed.state.files)) return null;

    return parsed.state as FilesState;
  } catch (err) {
    console.warn('[files] error al leer localStorage', err);
    return null;
  }
}

// ===== Notificación =====

function notificar(): void {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (err) {
      console.error('[files] error en listener', err);
    }
  }
  programarGuardado();
}

// ===== API pública =====

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getState(): FilesState {
  return state;
}

export function getActiveFile(): FileData | null {
  if (!state.activeId) return null;
  return state.files.find((f) => f.id === state.activeId) ?? null;
}

export function crearArchivo(nombre?: string): FileData {
  const nombreFinal = nombreUnico(nombre ?? 'nuevo.js');
  const archivo: FileData = {
    id: generarId(),
    name: nombreFinal,
    language: inferirLenguaje(nombreFinal),
    content: '',
    dirty: false,
  };
  state = {
    files: [...state.files, archivo],
    activeId: archivo.id,
  };
  notificar();
  return archivo;
}

/**
 * Añade un archivo al editor (típicamente uno leído del disco).
 * Si ya hay un archivo con el mismo `path`, lo activa en vez de duplicar.
 */
export function agregarArchivo(data: {
  name: string;
  content: string;
  dirty?: boolean;
  path?: string;
}): FileData {
  if (data.path) {
    const existente = state.files.find((f) => f.path === data.path);
    if (existente) {
      if (state.activeId !== existente.id) {
        state = { ...state, activeId: existente.id };
        notificar();
      }
      return existente;
    }
  }

  const archivo: FileData = {
    id: generarId(),
    name: data.name,
    language: inferirLenguaje(data.name),
    content: data.content,
    dirty: data.dirty ?? false,
    path: data.path,
  };

  state = {
    files: [...state.files, archivo],
    activeId: archivo.id,
  };
  notificar();
  return archivo;
}

/**
 * Vincula un archivo en memoria a una ruta en disco.
 * Se usa después de guardar un archivo creado con `+`.
 */
export function vincularArchivo(
  id: string,
  path: string,
  name: string
): void {
  state = {
    ...state,
    files: state.files.map((f) =>
      f.id === id
        ? {
            ...f,
            path,
            name,
            language: inferirLenguaje(name),
            dirty: false,
          }
        : f
    ),
  };
  notificar();
}

export function cerrarArchivo(id: string): void {
  const index = state.files.findIndex((f) => f.id === id);
  if (index === -1) return;

  const nuevos = state.files.filter((f) => f.id !== id);
  let nuevoActivo = state.activeId;

  if (state.activeId === id) {
    if (nuevos.length === 0) {
      nuevoActivo = null;
    } else {
      const siguiente = nuevos[Math.min(index, nuevos.length - 1)];
      nuevoActivo = siguiente.id;
    }
  }

  state = { files: nuevos, activeId: nuevoActivo };
  notificar();
}

export function cambiarArchivo(id: string): void {
  if (state.activeId === id) return;
  if (!state.files.some((f) => f.id === id)) return;

  state = { ...state, activeId: id };
  notificar();
}

export function actualizarContenido(id: string, content: string): void {
  const file = state.files.find((f) => f.id === id);
  if (!file) return;
  if (file.content === content) return;

  state = {
    ...state,
    files: state.files.map((f) =>
      f.id === id ? { ...f, content, dirty: true } : f
    ),
  };
  notificar();
}

export function marcarGuardado(id: string): void {
  const file = state.files.find((f) => f.id === id);
  if (!file || !file.dirty) return;

  state = {
    ...state,
    files: state.files.map((f) =>
      f.id === id ? { ...f, dirty: false } : f
    ),
  };
  notificar();
}

export function hayCambiosSinGuardar(): boolean {
  return state.files.some((f) => f.dirty);
}

export function renombrarArchivo(id: string, nuevoNombre: string): void {
  const file = state.files.find((f) => f.id === id);
  if (!file) return;

  state = {
    ...state,
    files: state.files.map((f) =>
      f.id === id
        ? { ...f, name: nuevoNombre, language: inferirLenguaje(nuevoNombre) }
        : f
    ),
  };
  notificar();
}

// ===== Inicialización =====

export function inicializarEstado(): void {
  const cargado = cargarDeStorage();

  if (cargado) {
    state = cargado;
    if (state.files.length > 0 && !state.files.some((f) => f.id === state.activeId)) {
      state = { ...state, activeId: state.files[0].id };
    } else if (state.files.length === 0) {
      state = { files: [], activeId: null };
    }
  } else {
    // Sin estado previo: empezamos vacíos. El usuario decidirá qué abrir.
    state = { files: [], activeId: null };
    guardarEnStorage();
  }

  notificar();
}

/**
 * Actualiza el contenido sin marcar como dirty.
 * Usado al recargar desde disco (el contenido viene del propio disco).
 */
export function actualizarContenidoSilencioso(id: string, content: string): void {
  const file = state.files.find((f) => f.id === id);
  if (!file) return;

  state = {
    ...state,
    files: state.files.map((f) =>
      f.id === id ? { ...f, content, dirty: false } : f
    ),
  };
  notificar();
}

/**
 * Actualización genérica de campos de un archivo.
 * Si se cambia el nombre, se recalcula el lenguaje.
 */
export function actualizarArchivo(
  id: string,
  cambios: Partial<Pick<FileData, 'name' | 'path' | 'language'>>
): void {
  const file = state.files.find((f) => f.id === id);
  if (!file) return;

  state = {
    ...state,
    files: state.files.map((f) => {
      if (f.id !== id) return f;
      const actualizado = { ...f, ...cambios };
      if (cambios.name) {
        actualizado.language = inferirLenguaje(cambios.name);
      }
      return actualizado;
    }),
  };
  notificar();
}