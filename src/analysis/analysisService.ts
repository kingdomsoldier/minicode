// minicode - servicio de análisis (orquesta worker + editor + estado)

import { analizar, reiniciarAnalysisWorker } from './analysisClient.js';
import * as files from '../state/files.js';
import type { AnalysisResult, Scope } from './types.js';
import type { EditorInstance } from '../editor/codemirror.js';

// ===== Tipos =====

type Listener = (resultado: AnalysisResult | null) => void;

// ===== Estado interno =====

const listeners = new Set<Listener>();

let resultadoActual: AnalysisResult | null = null;
let versionActual = 0;
let fileIdActual: string | null = null;
let timerDebounce: number | null = null;
let editorRef: EditorInstance | null = null;

let unsubFiles: (() => void) | null = null;
let unsubEditor: (() => void) | null = null;

// ===== Debounce adaptativo =====

function calcularDelay(code: string): number {
  const lineas = (code.match(/\n/g)?.length ?? 0) + 1;

  if (lineas < 500) return 200;
  if (lineas < 2000) return 500;
  if (lineas < 3000) return 1000;

  return -1; // desactivado
}

// ===== Notificación =====

function notificar(): void {
  for (const fn of listeners) {
    try {
      fn(resultadoActual);
    } catch (err) {
      console.error('[analysis] error en listener', err);
    }
  }
}

// ===== Utilidades de scopes =====

/**
 * Devuelve el scope más profundo que contiene la posición dada.
 * Si no hay ninguno, devuelve null.
 */
export function scopeEnPosicion(scopes: Scope[], pos: number): Scope | null {
  let mejor: Scope | null = null;

  for (const s of scopes) {
    if (pos >= s.start && pos <= s.end) {
      if (!mejor || s.end - s.start < mejor.end - mejor.start) {
        mejor = s;
      }
    }
  }

  return mejor;
}

// ===== Ejecución del análisis =====

function cancelarDebounce(): void {
  if (timerDebounce !== null) {
    clearTimeout(timerDebounce);
    timerDebounce = null;
  }
}

async function ejecutarAnalisis(fileId: string, code: string): Promise<void> {
  const versionDeEstaEjecucion = ++versionActual;

  try {
    const resultado = await analizar(fileId, versionDeEstaEjecucion, code);

    if (
      resultado.version !== versionActual ||
      resultado.fileId !== fileIdActual
    ) {
      return;
    }

    resultadoActual = resultado;
    notificar();
  } catch (err) {
    console.error('[analysis] error al analizar', err);
  }
}

function programarAnalisis(fileId: string, code: string): void {
  cancelarDebounce();

  const delay = calcularDelay(code);

  if (delay < 0) {
    resultadoActual = {
      fileId,
      version: ++versionActual,
      timestamp: Date.now(),
      size: code.length,
      scopes: [],
      symbols: [],
      objects: [],
      errors: [],
      durationMs: 0,
    };
    notificar();
    return;
  }

  timerDebounce = window.setTimeout(() => {
    timerDebounce = null;
    void ejecutarAnalisis(fileId, code);
  }, delay);
}

// ===== Gestión del archivo activo =====

function onArchivoActivoCambia(): void {
  const state = files.getState();
  const active = state.files.find((f) => f.id === state.activeId);

  cancelarDebounce();

  if (!active) {
    fileIdActual = null;
    resultadoActual = null;
    notificar();
    return;
  }

  fileIdActual = active.id;
  void ejecutarAnalisis(active.id, active.content);
}

// ===== Escucha de cambios del editor =====

function onEditorUpdate(): void {
  if (!editorRef) return;

  const active = files.getActiveFile();
  if (!active) return;

  const code = editorRef.getValue();
  programarAnalisis(active.id, code);
}

// ===== API pública =====

export interface ServicioAnalisis {
  analizarAhora: () => Promise<void>;
  obtenerResultado: () => AnalysisResult | null;
  obtenerScopeEnPosicion: (pos: number) => Scope | null;
  suscribir: (fn: Listener) => () => void;
  destruir: () => void;
}

let servicioInicializado: ServicioAnalisis | null = null;

export function iniciarServicioAnalisis(editor: EditorInstance): ServicioAnalisis {
  if (servicioInicializado) return servicioInicializado;

  editorRef = editor;

  unsubFiles = files.subscribe(() => {
    const state = files.getState();
    const active = state.files.find((f) => f.id === state.activeId);

    if (active?.id !== fileIdActual) {
      onArchivoActivoCambia();
    }
  });

  const editorUpdateHandler = () => onEditorUpdate();
  editor.view.dom.addEventListener(
    'minicode:editor-update',
    editorUpdateHandler as EventListener
  );

  unsubEditor = () => {
    editor.view.dom.removeEventListener(
      'minicode:editor-update',
      editorUpdateHandler as EventListener
    );
  };

  onArchivoActivoCambia();

  const servicio: ServicioAnalisis = {
    analizarAhora: async () => {
      const active = files.getActiveFile();
      if (!active) return;
      cancelarDebounce();
      await ejecutarAnalisis(active.id, active.content);
    },
    obtenerResultado: () => resultadoActual,
    obtenerScopeEnPosicion: (pos) => {
      if (!resultadoActual) return null;
      return scopeEnPosicion(resultadoActual.scopes, pos);
    },
    suscribir: (fn) => {
      listeners.add(fn);
      fn(resultadoActual);
      return () => listeners.delete(fn);
    },
    destruir: () => {
      cancelarDebounce();
      unsubFiles?.();
      unsubEditor?.();
      unsubFiles = null;
      unsubEditor = null;
      editorRef = null;
      fileIdActual = null;
      resultadoActual = null;
      versionActual = 0;
      listeners.clear();
      reiniciarAnalysisWorker();
      servicioInicializado = null;
    },
  };

  servicioInicializado = servicio;
  return servicio;
}

export function getServicioAnalisis(): ServicioAnalisis | null {
  return servicioInicializado;
}
