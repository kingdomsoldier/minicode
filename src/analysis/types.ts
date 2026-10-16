// minicode - tipos compartidos del sistema de análisis

// ===== Scopes =====

export type ScopeKind = 'global' | 'function' | 'block' | 'class' | 'catch' | 'loop';

export interface Scope {
  id: string;
  kind: ScopeKind;
  parentId: string | null;
  start: number;
  end: number;
  range: [number, number];
}

// ===== Símbolos =====

export type SymbolKind =
  | 'variable'
  | 'function'
  | 'class'
  | 'parameter'
  | 'import'
  | 'catchParam';

export interface Symbol {
  id: string;
  name: string;
  kind: SymbolKind;
  scopeId: string;
  declarationStart: number;
  isVar?: boolean;
  isHoisted?: boolean;
}

// ===== Formas de valores =====

export type ShapeKind =
  | 'object'           // objeto literal
  | 'array'            // array literal
  | 'function'         // función asignada a variable
  | 'class-instance';  // instancia de clase (new X())

export interface ObjectShape {
  /** Nombre de la variable que contiene el valor */
  variableName: string;
  /** Propiedades / métodos detectados */
  properties: string[];
  /** Scope donde se declaró */
  scopeId: string;
  /** Tipo de valor */
  kind: ShapeKind;
}

// ===== Errores de sintaxis =====

export interface SyntaxErrorInfo {
  message: string;
  from: number;
  to: number;
  line: number;
  column: number;
}

// ===== Resultado del análisis =====

export interface AnalysisResult {
  fileId: string;
  version: number;
  timestamp: number;
  size: number;
  scopes: Scope[];
  symbols: Symbol[];
  objects: ObjectShape[];
  errors: SyntaxErrorInfo[];
  durationMs: number;
}

// ===== Mensajes del worker =====

export interface AnalysisRequest {
  type: 'analyze';
  fileId: string;
  version: number;
  code: string;
}

export type AnalysisResponse = AnalysisResult;
