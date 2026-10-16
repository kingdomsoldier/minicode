// minicode - extracción de scopes y símbolos desde el AST
// Recorre el AST manualmente con enter/leave para gestionar la pila de scopes.

import type { Scope, ScopeKind, Symbol, SymbolKind } from './types.js';

// ===== Configuración =====

// Propiedades del nodo que NO son hijos AST
const SKIP_KEYS = new Set(['loc', 'range', 'start', 'end', 'parent']);

// ===== Estado del extractor =====

interface ExtractorState {
  scopes: Scope[];
  symbols: Symbol[];
  scopeCounter: number;
  symbolCounter: number;
  scopeStack: Scope[];
}

function crearEstado(): ExtractorState {
  return {
    scopes: [],
    symbols: [],
    scopeCounter: 0,
    symbolCounter: 0,
    scopeStack: [],
  };
}

function scopeActual(state: ExtractorState): Scope {
  return state.scopeStack[state.scopeStack.length - 1];
}

/**
 * Busca el scope de función más cercano subiendo por la pila.
 * Es lo que necesita `var` (no respeta bloques, sube hasta la función).
 */
function scopeFuncionMasCercano(state: ExtractorState): Scope {
  for (let i = state.scopeStack.length - 1; i >= 0; i--) {
    const s = state.scopeStack[i];
    if (s.kind === 'function' || s.kind === 'global') {
      return s;
    }
  }
  return state.scopeStack[0];
}

// ===== Gestión de scopes =====

function pushScope(state: ExtractorState, kind: ScopeKind, node: any): Scope {
  const parent = scopeActual(state) ?? null;
  const scope: Scope = {
    id: `scope-${state.scopeCounter++}`,
    kind,
    parentId: parent?.id ?? null,
    start: node.start,
    end: node.end,
    range: [node.start, node.end],
  };
  state.scopes.push(scope);
  state.scopeStack.push(scope);
  return scope;
}

function popScope(state: ExtractorState): void {
  state.scopeStack.pop();
}

// ===== Gestión de símbolos =====

function addSymbol(
  state: ExtractorState,
  name: string,
  kind: SymbolKind,
  node: any,
  options: { scopeId?: string; isVar?: boolean; isHoisted?: boolean } = {}
): void {
  state.symbols.push({
    id: `sym-${state.symbolCounter++}`,
    name,
    kind,
    scopeId: options.scopeId ?? scopeActual(state).id,
    declarationStart: node.start,
    isVar: options.isVar,
    isHoisted: options.isHoisted,
  });
}

/**
 * Extrae símbolos de un patrón (identifier, destructuring, rest, default).
 */
function extractPattern(
  state: ExtractorState,
  pattern: any,
  kind: SymbolKind,
  targetScopeId: string,
  isVar: boolean
): void {
  if (!pattern) return;

  switch (pattern.type) {
    case 'Identifier':
      addSymbol(state, pattern.name, kind, pattern, {
        scopeId: targetScopeId,
        isVar,
      });
      return;

    case 'ObjectPattern':
      for (const prop of pattern.properties) {
        if (prop.type === 'Property') {
          extractPattern(state, prop.value, kind, targetScopeId, isVar);
        } else if (prop.type === 'RestElement') {
          extractPattern(state, prop.argument, kind, targetScopeId, isVar);
        }
      }
      return;

    case 'ArrayPattern':
      for (const elem of pattern.elements) {
        if (elem) extractPattern(state, elem, kind, targetScopeId, isVar);
      }
      return;

    case 'RestElement':
      extractPattern(state, pattern.argument, kind, targetScopeId, isVar);
      return;

    case 'AssignmentPattern':
      // `a = 5` en params → declaramos `a`
      extractPattern(state, pattern.left, kind, targetScopeId, isVar);
      return;
  }
}

// ===== Detección de nodos =====

function isFunctionNode(node: any): boolean {
  return (
    node?.type === 'FunctionDeclaration' ||
    node?.type === 'FunctionExpression' ||
    node?.type === 'ArrowFunctionExpression'
  );
}

// ===== Enter =====

function handleEnter(
  state: ExtractorState,
  node: any,
  parent: any,
  parentKey: string | null
): void {
  switch (node.type) {
    case 'Program':
      pushScope(state, 'global', node);
      return;

    case 'FunctionDeclaration': {
      // El nombre va en el scope PADRE (hoisting)
      if (node.id) {
        addSymbol(state, node.id.name, 'function', node.id, {
          isHoisted: true,
        });
      }
      pushScope(state, 'function', node);
      const scopeId = scopeActual(state).id;
      for (const param of node.params) {
        extractPattern(state, param, 'parameter', scopeId, false);
      }
      return;
    }

    case 'FunctionExpression': {
      pushScope(state, 'function', node);
      // El nombre (si existe) vive dentro de su propio scope
      if (node.id) {
        addSymbol(state, node.id.name, 'function', node.id, {
          isHoisted: false,
        });
      }
      const scopeId = scopeActual(state).id;
      for (const param of node.params) {
        extractPattern(state, param, 'parameter', scopeId, false);
      }
      return;
    }

    case 'ArrowFunctionExpression': {
      pushScope(state, 'function', node);
      const scopeId = scopeActual(state).id;
      for (const param of node.params) {
        extractPattern(state, param, 'parameter', scopeId, false);
      }
      return;
    }

    case 'BlockStatement': {
      // No crear scope si es el cuerpo directo de una función
      if (parent && isFunctionNode(parent) && parentKey === 'body') {
        return;
      }
      pushScope(state, 'block', node);
      return;
    }

    case 'VariableDeclaration': {
      const isVar = node.kind === 'var';
      // `var` va al scope de función más cercano
      // `let` / `const` van al scope actual (bloque)
      const targetScope = isVar
        ? scopeFuncionMasCercano(state)
        : scopeActual(state);

      for (const decl of node.declarations) {
        extractPattern(state, decl.id, 'variable', targetScope.id, isVar);
      }
      return;
    }

    case 'ClassDeclaration': {
      if (node.id) {
        addSymbol(state, node.id.name, 'class', node.id);
      }
      pushScope(state, 'class', node);
      return;
    }

    case 'ClassExpression': {
      pushScope(state, 'class', node);
      if (node.id) {
        addSymbol(state, node.id.name, 'class', node.id);
      }
      return;
    }

    case 'CatchClause': {
      pushScope(state, 'catch', node);
      if (node.param) {
        const scopeId = scopeActual(state).id;
        extractPattern(state, node.param, 'catchParam', scopeId, false);
      }
      return;
    }

    case 'ImportDeclaration': {
      for (const spec of node.specifiers) {
        if (spec.local) {
          addSymbol(state, spec.local.name, 'import', spec.local);
        }
      }
      return;
    }
  }
}

// ===== Leave =====

function handleLeave(
  state: ExtractorState,
  node: any,
  parent: any,
  parentKey: string | null
): void {
  switch (node.type) {
    case 'Program':
      // El scope global nunca se cierra durante el recorrido
      return;

    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
    case 'ClassDeclaration':
    case 'ClassExpression':
    case 'CatchClause':
      popScope(state);
      return;

    case 'BlockStatement':
      if (parent && isFunctionNode(parent) && parentKey === 'body') {
        return; // nunca se hizo push
      }
      popScope(state);
      return;
  }
}

// ===== Recorrido =====

function walkNode(
  state: ExtractorState,
  node: any,
  parent: any,
  parentKey: string | null
): void {
  if (!node || typeof node.type !== 'string') return;

  handleEnter(state, node, parent, parentKey);

  for (const key in node) {
    if (SKIP_KEYS.has(key)) continue;
    const child = (node as any)[key];

    if (Array.isArray(child)) {
      for (const c of child) {
        if (c && typeof c === 'object' && typeof c.type === 'string') {
          walkNode(state, c, node, key);
        }
      }
    } else if (
      child &&
      typeof child === 'object' &&
      typeof child.type === 'string'
    ) {
      walkNode(state, child, node, key);
    }
  }

  handleLeave(state, node, parent, parentKey);
}

// ===== API pública =====

export interface ExtractResult {
  scopes: Scope[];
  symbols: Symbol[];
}

export function extractSymbols(ast: any): ExtractResult {
  const state = crearEstado();
  walkNode(state, ast, null, null);
  return {
    scopes: state.scopes,
    symbols: state.symbols,
  };
}
