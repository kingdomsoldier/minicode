// minicode - configuración y creación del editor CodeMirror

import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { linter, setDiagnostics } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { minicodeCompletionSource } from '../suggestions/completionSource.js';
import { syncKeyboardClassToEditor } from './keyboardAwareTooltip.js';

export interface SetValueOptions {
  silent?: boolean;
}

export interface EditorInstance {
  view: EditorView;
  getValue: () => string;
  setValue: (value: string, options?: SetValueOptions) => void;
  setLanguage: (language: string) => void;
  setDiagnostics: (diagnostics: Diagnostic[]) => void;
  focus: () => void;
  destroy: () => void;
}

export interface CreateEditorOptions {
  parent: HTMLElement;
  initialValue?: string;
  initialLanguage?: string;
  onUpdate?: (value: string) => void;
}

/**
 * Devuelve la extensión de CodeMirror según el lenguaje.
 */
function extensionDeLenguaje(language: string): Extension {
  switch (language) {
    case 'javascript':
      return javascript({ jsx: true });
    case 'json':
      return json();
    default:
      return [];
  }
}

export function createEditor({
  parent,
  initialValue = '',
  initialLanguage = 'javascript',
  onUpdate,
}: CreateEditorOptions): EditorInstance {
  const languageCompartment = new Compartment();
  let silent = false;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      if (!silent && onUpdate) {
        onUpdate(update.state.doc.toString());
      }

      if (!silent) {
        const evento = new CustomEvent('minicode:editor-update');
        update.view.dom.dispatchEvent(evento);
      }
    }
  });

  const mobileTheme = EditorView.theme({
    '&': {
      fontSize: '14px',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      padding: '12px 0',
      caretColor: '#fff',
    },
    '.cm-line': {
      padding: '0 12px',
    },
    '.cm-scroller': {
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      lineHeight: '1.5',
    },
    '.cm-gutters': {
      minWidth: '32px',
      fontSize: '12px',
    },
    '.cm-focused': {
      outline: 'none',
    },
  });

  // Extensión base de lint: necesaria para usar `setDiagnostics`.
  // `needsRefresh: () => false` evita que CodeMirror ejecute el linter
  // tras cada cambio y borre los diagnósticos que aplicamos manualmente.
  const linterBase = linter(() => [], {
    needsRefresh: () => false,
    delay: 999999,
  });

  const state = EditorState.create({
    doc: initialValue,
    extensions: [
      lineNumbers(),
      history(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({
        override: [minicodeCompletionSource],
        activateOnTyping: true,
        closeOnBlur: true,
        maxRenderedOptions: 8,
        defaultKeymap: true,
        icons: true,
      }),
      indentOnInput(),
      highlightActiveLine(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
        indentWithTab,
      ]),
      languageCompartment.of(extensionDeLenguaje(initialLanguage)),
      linterBase,
      oneDark,
      mobileTheme,
      EditorView.lineWrapping,
      updateListener,
    ],
  });

  const view = new EditorView({
    state,
    parent,
  });

  // Sincronizar la clase `cm-keyboard-open` con el estado del teclado virtual
  const stopKeyboardSync = syncKeyboardClassToEditor(view);

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (value: string, options?: SetValueOptions) => {
      silent = options?.silent ?? false;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
      silent = false;
    },
    setLanguage: (language: string) => {
      view.dispatch({
        effects: languageCompartment.reconfigure(extensionDeLenguaje(language)),
      });
    },
    setDiagnostics: (diagnostics: Diagnostic[]) => {
      view.dispatch(setDiagnostics(view.state, diagnostics));
    },
    focus: () => view.focus(),
    destroy: () => {
      stopKeyboardSync();
      view.destroy();
    },
  };
}
