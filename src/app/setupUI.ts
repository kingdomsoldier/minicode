// minicode - montaje de toda la interfaz

import { createActions } from '../ui/actions.js';
import { createTabs } from '../ui/tabs.js';
import { createToolbar } from '../ui/toolbar.js';
import { createFileBrowser } from '../ui/fileBrowser.js';
import { createItemMenu } from '../ui/itemMenu.js';
import { createOutput } from '../ui/output.js';
import { createEditorHeader } from '../ui/editorHeader.js';
import { createActionsMenu } from '../ui/actionsMenu.js';
import { serverFS } from '../files/serverFS.js';
import * as files from '../state/files.js';
import {
  getActionsVisible,
  toggleActionsVisible,
} from '../state/uiPreferences.js';

import { setupEditor } from './setupEditor.js';
import { crearGuardarArchivo } from './commands/save.js';
import { recargarArchivoActivo } from './commands/reload.js';
import { renombrarArchivoActivo } from './commands/rename.js';
import { eliminarArchivoActivo } from './commands/remove.js';
import { cerrarTab } from './commands/closeTab.js';
import { crearArchivoNuevo } from './commands/newFile.js';
import { abrirArchivoEnEditor } from './commands/openFile.js';
import { guardarTodo } from './commands/saveAll.js';
import { recargarTodo } from './commands/reloadAll.js';
import { cerrarTodo } from './commands/closeAll.js';
import { crearEjecutar } from './commands/run.js';
import { cancelarEjecucion, reiniciarWorker } from '../runtime/runInWorker.js';
import { iniciarServicioAnalisis } from '../analysis/analysisService.js';
import {
  renombrarItem,
  copiarItem,
  moverItem,
  eliminarItem,
} from './commands/manageItem.js';
import type { FileEntry } from '../ui/fileBrowser.js';
import type { Diagnostic } from '@codemirror/lint';

export function setupUI(app: HTMLElement) {
  // ===== Referencias mutuas =====
  let itemActual: FileEntry | null = null;
  let itemMenu: ReturnType<typeof createItemMenu> | null = null;

  // ===== File browser =====
  const fileBrowser = createFileBrowser({
    provider: serverFS,
    onSelect: (file) => abrirArchivoEnEditor(file),
    onRequestItemMenu: (item) => {
      if (!itemMenu) return;
      itemActual = item;
      itemMenu.open({
        itemName: item.name,
        itemType: item.type,
      });
    },
  });

  // ===== Item menu =====
  itemMenu = createItemMenu({
    onRename: async () => {
      if (itemActual) {
        await renombrarItem(itemActual);
        fileBrowser.refresh();
      }
    },
    onCopy: async () => {
      if (itemActual) {
        await copiarItem(itemActual, fileBrowser);
        fileBrowser.refresh();
      }
    },
    onMove: async () => {
      if (itemActual) {
        await moverItem(itemActual, fileBrowser);
        fileBrowser.refresh();
      }
    },
    onDelete: async () => {
      if (itemActual) {
        await eliminarItem(itemActual);
        fileBrowser.refresh();
      }
    },
  });

  // ===== Referencia a actions =====
  let actionsRef: ReturnType<typeof createActions> | null = null;

  // ===== Panel de salida =====
  const output = createOutput({
    onCancel: () => cancelarEjecucion(),
    onRestart: () => {
      reiniciarWorker();
      output.limpiar();
      output.agregar({
        level: 'info',
        args: ['Worker reiniciado'],
      });
    },
  });

  // ===== Comandos =====
  const guardar = crearGuardarArchivo(fileBrowser);

  const ejecutar = crearEjecutar(output, (ejecutando) => {
    actionsRef?.update({ ejecutando });
  });

  // ===== Actions menu (popup del ⋯) =====
  const actionsMenu = createActionsMenu({
    onNuevoArchivo: () => crearArchivoNuevo(),
    onArchivos: () => fileBrowser.open(),
    onGuardarTodo: async () => {
      const { guardados, fallidos } = await guardarTodo();
      if (fallidos > 0) {
        window.alert(`Guardados: ${guardados}\nFallidos: ${fallidos}`);
      }
    },
    onRecargarTodo: async () => {
      const { recargados, fallidos } = await recargarTodo();
      if (fallidos > 0) {
        window.alert(`Recargados: ${recargados}\nFallidos: ${fallidos}`);
      }
    },
    onCerrarTodo: () => cerrarTodo(),
    getState: () => {
      const state = files.getState();
      return {
        hasDirtyOnDisk: state.files.some((f) => f.dirty && f.path),
        hasAnyOnDisk: state.files.some((f) => f.path),
        hasAnyFile: state.files.length > 0,
      };
    },
  });

  // ===== Estado inicial de la barra superior =====
  const topBarVisibleInicial = getActionsVisible();

  // ===== Barra de acciones =====
  const actions = createActions({
    onUndo: () => { /* TODO */ },
    onRedo: () => { /* TODO */ },
    onSave: guardar,
    onReload: () => recargarArchivoActivo(),
    onRun: ejecutar,
    activeDirty: false,
    othersDirty: false,
    hasPath: false,
    ejecutando: false,
  });

  actionsRef = actions;

  // Montar el trigger del actionsMenu en el slot
  actions.menuSlot.appendChild(actionsMenu.el);

  // ===== Tabs =====
  const tabs = createTabs({
    onSelect: (id) => files.cambiarArchivo(id),
    onClose: (id) => cerrarTab(id),
    onNew: () => crearArchivoNuevo(),
  });

  // ===== Editor =====
  const { editor, container: editorContainer } = setupEditor(app);

  // ===== Header del editor =====
  const editorHeader = createEditorHeader({
    topBarVisible: topBarVisibleInicial,
  });

  editorHeader.setOnToggle(() => {
    const visible = toggleActionsVisible();

    // Si se colapsa la barra con el menú abierto, lo cerramos
    if (!visible) actionsMenu.close();

    actions.el.classList.toggle('is-hidden', !visible);
    tabs.el.classList.toggle('is-hidden', !visible);
    editorHeader.update({ topBarVisible: visible });
  });

  if (!topBarVisibleInicial) {
    actions.el.classList.add('is-hidden');
    tabs.el.classList.add('is-hidden');
  }

  // ===== Servicio de análisis =====
  const analisis = iniciarServicioAnalisis(editor);
  (window as any).__analisis = analisis;

  analisis.suscribir((resultado) => {
    if (!resultado) {
      editorHeader.update({ errorCount: 0 });
      editor.setDiagnostics([]);
      return;
    }

    const diagnosticos: Diagnostic[] = resultado.errors.map((err) => ({
      from: err.from,
      to: err.to,
      severity: 'error',
      message: err.message,
    }));

    editor.setDiagnostics(diagnosticos);
    editorHeader.update({ errorCount: resultado.errors.length });
  });

  // ===== Empty state =====
  const emptyState = crearEmptyState(
    () => crearArchivoNuevo(),
    () => fileBrowser.open()
  );
  editorContainer.appendChild(emptyState);

  // ===== Toolbar (símbolos) =====
  const toolbar = createToolbar({
    onInsert: (text) => insertarEnEditor(editor, text),
  });

  // ===== Montaje en el DOM =====
  app.insertBefore(actions.el, editorContainer);
  app.insertBefore(tabs.el, editorContainer);
  app.insertBefore(editorHeader.el, editorContainer);
  app.insertBefore(toolbar.el, null);
  app.insertBefore(output.el, toolbar.el);
  app.appendChild(fileBrowser.el);
  app.appendChild(itemMenu.el);

  // ===== Suscripción al estado =====
  suscribirEstado({
    tabs,
    actions,
    emptyState,
    editor,
    editorHeader,
  });

  // ===== Atajos de teclado =====
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      guardarTodo().then(({ fallidos }) => {
        if (fallidos > 0) {
          window.alert(`Algunos archivos no se pudieron guardar (${fallidos})`);
        }
      });
      return;
    }

    if (mod && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      guardar();
      return;
    }

    if (mod && e.key === 'Enter') {
      e.preventDefault();
      ejecutar();
      return;
    }
  });

  editor.focus();

  return { editor };
}

// ===== Helpers =====

function crearEmptyState(
  onNew: () => void,
  onOpen: () => void
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `
    <div class="empty-title">No hay archivos abiertos</div>
    <div class="empty-actions">
      <button type="button" class="empty-btn empty-btn-new">Nuevo archivo</button>
      <button type="button" class="empty-btn empty-btn-open">Abrir archivo</button>
    </div>
  `;

  const btnNew = el.querySelector('.empty-btn-new') as HTMLButtonElement;
  const btnOpen = el.querySelector('.empty-btn-open') as HTMLButtonElement;
  btnNew.addEventListener('click', onNew);
  btnOpen.addEventListener('click', onOpen);

  return el;
}

function insertarEnEditor(
  editor: ReturnType<typeof setupEditor>['editor'],
  text: string
): void {
  const { from, to } = editor.view.state.selection.main;
  editor.view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  });
  editor.focus();
}

interface SuscripcionDeps {
  tabs: ReturnType<typeof createTabs>;
  actions: ReturnType<typeof createActions>;
  emptyState: HTMLElement;
  editor: ReturnType<typeof setupEditor>['editor'];
  editorHeader: ReturnType<typeof createEditorHeader>;
}

function suscribirEstado({
  tabs,
  actions,
  emptyState,
  editor,
  editorHeader,
}: SuscripcionDeps): void {
  let ultimoActiveId: string | null = null;

  files.subscribe((state) => {
    tabs.update({
      tabs: state.files.map((f) => ({
        id: f.id,
        name: f.name,
        dirty: f.dirty,
        onDisk: !!f.path,
      })),
      activeId: state.activeId ?? undefined,
    });

    const active = state.files.find((f) => f.id === state.activeId);

    actions.update({
      activeDirty: !!active?.dirty,
      othersDirty: state.files.some(
        (f) => f.dirty && f.id !== state.activeId
      ),
      hasPath: !!active?.path,
    });

    if (state.files.length === 0) {
      emptyState.classList.add('is-visible');
    } else {
      emptyState.classList.remove('is-visible');
    }

    const contenidoEditor = editor.getValue();
    const contenidoActivo = active?.content ?? '';

    if (
      state.activeId !== ultimoActiveId ||
      contenidoEditor !== contenidoActivo
    ) {
      const lenguaje = active?.language ?? 'plain';
      editor.setLanguage(lenguaje);
      editor.setValue(contenidoActivo, { silent: true });
      editorHeader.update({ language: lenguaje });
      ultimoActiveId = state.activeId;
    }
  });
}
