// minicode - extracción de propiedades de objetos y formas de valores
// Detecta:
//   const user = { name, age }        → shape kind='object', props=[name, age]
//   const arr = [1, 2, 3]             → kind='array'
//   const fn = () => {}               → kind='function'
//   const calc = new Calculator()     → kind='class-instance', props=métodos

import type { ObjectShape, Scope } from './types.js';

const SKIP_KEYS = new Set(['loc', 'range', 'start', 'end', 'parent']);

// ===== Walk genérico =====

function walk(node: any, visit: (n: any) => void): void {
  if (!node || typeof node.type !== 'string') return;
  visit(node);

  for (const key in node) {
    if (SKIP_KEYS.has(key)) continue;
    const child = (node as any)[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        if (c && typeof c === 'object' && typeof c.type === 'string') {
          walk(c, visit);
        }
      }
    } else if (
      child &&
      typeof child === 'object' &&
      typeof child.type === 'string'
    ) {
      walk(child, visit);
    }
  }
}

// ===== Helpers de extracción =====

/**
 * Extrae las propiedades de un ObjectExpression.
 * Ignora spread, computed properties y getters/setters (por ahora).
 */
function extraerPropiedadesDeObjeto(node: any): string[] {
  const props: string[] = [];

  for (const p of node.properties) {
    if (p.type !== 'Property') continue;
    if (p.computed) continue; // [clave]: valor → no podemos saber la clave

    if (p.key.type === 'Identifier') {
      props.push(p.key.name);
    } else if (
      p.key.type === 'Literal' &&
      typeof p.key.value === 'string'
    ) {
      props.push(p.key.value);
    }
  }

  return props;
}

/**
 * Extrae los métodos y propiedades de una clase (ClassDeclaration o ClassExpression).
 */
function extraerMiembrosDeClase(classNode: any): string[] {
  const miembros: string[] = [];
  if (!classNode.body || !Array.isArray(classNode.body.body)) return miembros;

  for (const m of classNode.body.body) {
    if (m.type === 'MethodDefinition' && m.key) {
      if (m.key.type === 'Identifier') {
        miembros.push(m.key.name);
      } else if (
        m.key.type === 'Literal' &&
        typeof m.key.value === 'string'
      ) {
        miembros.push(m.key.value);
      }
    } else if (m.type === 'PropertyDefinition' && m.key) {
      if (m.key.type === 'Identifier') {
        miembros.push(m.key.name);
      }
    }
  }

  return miembros;
}

/**
 * Devuelve el scope más pequeño que contiene la posición dada.
 * Si no encuentra ninguno, devuelve el global (el primero de la lista).
 */
function encontrarScope(scopes: Scope[], position: number): Scope {
  let mejor: Scope | null = null;

  for (const s of scopes) {
    if (position >= s.start && position <= s.end) {
      if (!mejor || s.end - s.start < mejor.end - mejor.start) {
        mejor = s;
      }
    }
  }

  return mejor ?? scopes[0];
}

// ===== Extracción principal =====

export function extractObjects(ast: any, scopes: Scope[]): ObjectShape[] {
  const shapes: ObjectShape[] = [];

  // ===== Pasada 1: registrar clases y sus métodos =====
  const metodosDeClase = new Map<string, string[]>();

  walk(ast, (node) => {
    if (node.type === 'ClassDeclaration' && node.id) {
      metodosDeClase.set(node.id.name, extraerMiembrosDeClase(node));
    } else if (
      node.type === 'ClassExpression' &&
      node.id &&
      !metodosDeClase.has(node.id.name)
    ) {
      metodosDeClase.set(node.id.name, extraerMiembrosDeClase(node));
    }
  });

  // ===== Pasada 2: registrar variables con valores interesantes =====
  walk(ast, (node) => {
    if (node.type !== 'VariableDeclaration') return;

    const scope = encontrarScope(scopes, node.start);

    for (const decl of node.declarations) {
      if (!decl.init) continue;
      // Solo manejamos declaraciones simples (Identifier = ...)
      // El destructuring no genera una forma única
      if (decl.id.type !== 'Identifier') continue;

      const name = decl.id.name;
      const init = decl.init;

      if (init.type === 'ObjectExpression') {
        shapes.push({
          variableName: name,
          properties: extraerPropiedadesDeObjeto(init),
          scopeId: scope.id,
          kind: 'object',
        });
      } else if (init.type === 'ArrayExpression') {
        shapes.push({
          variableName: name,
          properties: [],
          scopeId: scope.id,
          kind: 'array',
        });
      } else if (
        init.type === 'ArrowFunctionExpression' ||
        init.type === 'FunctionExpression'
      ) {
        shapes.push({
          variableName: name,
          properties: [],
          scopeId: scope.id,
          kind: 'function',
        });
      } else if (
        init.type === 'NewExpression' &&
        init.callee?.type === 'Identifier'
      ) {
        const nombreClase = init.callee.name;
        const metodos = metodosDeClase.get(nombreClase) ?? [];
        shapes.push({
          variableName: name,
          properties: metodos,
          scopeId: scope.id,
          kind: 'class-instance',
        });
      }
    }
  });

  return shapes;
}
