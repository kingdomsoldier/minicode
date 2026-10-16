import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const plugins = [
  nodeResolve({
    browser: true,
    exportConditions: ['browser', 'default'],
  }),
  typescript({
    tsconfig: './tsconfig.json',
    compilerOptions: {
      declaration: false,
      declarationMap: false,
      outDir: null,
    },
  }),
];

export default [
  // ===== App principal =====
  {
    input: 'src/main.ts',
    output: {
      file: 'public/bundle.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins,
  },
  // ===== Worker de ejecución de código =====
  {
    input: 'src/runtime/runner.worker.ts',
    output: {
      file: 'public/runner.worker.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins,
  },
  // ===== Worker de análisis =====
  {
    input: 'src/analysis/analysis.worker.ts',
    output: {
      file: 'public/analysis.worker.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins,
  },
];
