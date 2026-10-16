// minicode - build del CSS (usado por `npm run build`)

import { compilarCss } from './lib/compileCss.js';

const total = compilarCss();
console.log(`✅ CSS compilado: ${total} archivos → public/styles.css`);
