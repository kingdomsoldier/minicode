// minicode - worker de análisis de JavaScript

import { parse } from 'acorn';
import { extractSymbols } from './extractSymbols.js';
import { extractObjects } from './extractObjects.js';
import type {
  AnalysisRequest,
  AnalysisResult,
  ObjectShape,
  Scope,
  Symbol as MinicodeSymbol,
  SyntaxErrorInfo,
} from './types.js';

// ===== Configuración del parser =====

const PARSE_OPTIONS = {
  ecmaVersion: 2024 as const,
  sourceType: 'module' as const,
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowImportExportEverywhere: true,
  allowHashBang: true,
  locations: true,
  ranges: true,
};

// ===== Conversión de error de acorn =====

function convertirError(err: any, code: string): SyntaxErrorInfo {
  const pos = typeof err.pos === 'number' ? err.pos : 0;
  const raisedAt = typeof err.raisedAt === 'number' ? err.raisedAt : pos;

  const from = Math.min(pos, code.length);
  const to = Math.min(raisedAt, code.length);
  const finalTo = to > from ? to : Math.min(from + 1, code.length);

  const line = typeof err.loc?.line === 'number' ? err.loc.line : 1;
  const column = typeof err.loc?.column === 'number' ? err.loc.column : 0;

  const message = String(err.message ?? 'Error de sintaxis').replace(
    /\s*\(\d+:\d+\)\s*$/,
    ''
  );

  return { message, from, to: finalTo, line, column };
}

// ===== Análisis =====

function analizar(req: AnalysisRequest): AnalysisResult {
  const inicio = performance.now();
  const { fileId, version, code } = req;

  const errores: SyntaxErrorInfo[] = [];
  let scopes: Scope[] = [];
  let symbols: MinicodeSymbol[] = [];
  let objects: ObjectShape[] = [];

  try {
    const ast = parse(code, PARSE_OPTIONS);

    // 1. Extraer scopes + símbolos
    const extraido = extractSymbols(ast);
    scopes = extraido.scopes;
    symbols = extraido.symbols;

    // 2. Extraer formas de valores (objetos, arrays, funciones, instancias)
    objects = extractObjects(ast, scopes);
  } catch (err: any) {
    errores.push(convertirError(err, code));
  }

  return {
    fileId,
    version,
    timestamp: Date.now(),
    size: code.length,
    scopes,
    symbols,
    objects,
    errors: errores,
    durationMs: Math.round(performance.now() - inicio),
  };
}

// ===== Escucha de mensajes =====

self.addEventListener('message', (event: MessageEvent<AnalysisRequest>) => {
  const data = event.data;
  if (data?.type === 'analyze') {
    const resultado = analizar(data);
    self.postMessage(resultado);
  }
});

export {};
