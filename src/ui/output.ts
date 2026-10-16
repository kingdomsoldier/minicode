// minicode - panel de salida de ejecución

import type { RunLog, RunResult } from '../runtime/runInWorker.js';

export interface OutputOptions {
  onClose?: () => void;
  onCancel?: () => void;
  onRestart?: () => void;
}

export interface OutputInstance {
  el: HTMLElement;
  mostrar: (resultado: RunResult) => void;
  agregar: (log: RunLog) => void;
  mostrarEjecutando: () => void;
  mostrarError: (mensaje: string) => void;
  abrir: () => void;
  cerrar: () => void;
  limpiar: () => void;
  estaVisible: () => boolean;
}

export function createOutput(options: OutputOptions = {}): OutputInstance {
  // ===== Contenedor principal =====
  const el = document.createElement('div');
  el.className = 'output-panel';

  // ===== Header =====
  const header = document.createElement('div');
  header.className = 'output-header';

  const title = document.createElement('div');
  title.className = 'output-title';
  title.textContent = 'Salida';

  const restartBtn = document.createElement('button');
  restartBtn.className = 'output-icon-btn';
  restartBtn.type = 'button';
  restartBtn.title = 'Reiniciar worker';
  restartBtn.setAttribute('aria-label', 'Reiniciar worker');
  restartBtn.textContent = '⟳';

  const clearBtn = document.createElement('button');
  clearBtn.className = 'output-icon-btn';
  clearBtn.type = 'button';
  clearBtn.title = 'Limpiar';
  clearBtn.setAttribute('aria-label', 'Limpiar salida');
  clearBtn.textContent = '🗑';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'output-icon-btn';
  closeBtn.type = 'button';
  closeBtn.title = 'Cerrar';
  closeBtn.setAttribute('aria-label', 'Cerrar salida');
  closeBtn.textContent = '×';

  header.appendChild(title);
  header.appendChild(restartBtn);
  header.appendChild(clearBtn);
  header.appendChild(closeBtn);

  // ===== Cuerpo =====
  const body = document.createElement('div');
  body.className = 'output-body';

  el.appendChild(header);
  el.appendChild(body);

  // ===== Helpers de render =====

  function crearLinea(log: RunLog): HTMLElement {
    const linea = document.createElement('div');
    linea.className = `output-line output-line-${log.level}`;

    const prefijo = document.createElement('span');
    prefijo.className = 'output-prefix';
    prefijo.textContent = '› ';

    const texto = document.createElement('span');
    texto.className = 'output-text';
    texto.textContent = log.args.join(' ');

    linea.appendChild(prefijo);
    linea.appendChild(texto);
    return linea;
  }

  function crearLineaError(message: string, stack?: string): HTMLElement {
    const contenedor = document.createElement('div');
    contenedor.className = 'output-line output-line-error';

    const cabecera = document.createElement('div');
    cabecera.className = 'output-line-header';

    const prefijo = document.createElement('span');
    prefijo.className = 'output-prefix';
    prefijo.textContent = '✕ ';

    const texto = document.createElement('span');
    texto.className = 'output-text';
    texto.textContent = message;

    cabecera.appendChild(prefijo);
    cabecera.appendChild(texto);
    contenedor.appendChild(cabecera);

    if (stack) {
      const stackEl = document.createElement('pre');
      stackEl.className = 'output-stack';
      const lineas = stack.split('\n');
      const stackLimpio = lineas.length > 1
        ? lineas.slice(1).join('\n').trim()
        : stack;
      stackEl.textContent = stackLimpio;
      contenedor.appendChild(stackEl);
    }

    return contenedor;
  }

  function crearLineaInfo(texto: string): HTMLElement {
    const contenedor = document.createElement('div');
    contenedor.className = 'output-line output-line-info';
    contenedor.textContent = texto;
    return contenedor;
  }

  /**
   * Línea especial "Ejecutando…" con botón detener.
   */
  function crearLineaEjecutando(): HTMLElement {
    const contenedor = document.createElement('div');
    contenedor.className = 'output-running';

    const icono = document.createElement('span');
    icono.className = 'output-running-icon';
    icono.textContent = '⏳';

    const texto = document.createElement('span');
    texto.className = 'output-running-text';
    texto.textContent = 'Ejecutando…';

    const stopBtn = document.createElement('button');
    stopBtn.className = 'output-stop-btn';
    stopBtn.type = 'button';
    stopBtn.title = 'Detener ejecución';
    stopBtn.setAttribute('aria-label', 'Detener ejecución');

    // Icono ⏹ + texto "Detener"
    const stopIcon = document.createElement('span');
    stopIcon.textContent = '⏹';
    const stopText = document.createElement('span');
    stopText.textContent = 'Detener';

    stopBtn.appendChild(stopIcon);
    stopBtn.appendChild(stopText);

    stopBtn.addEventListener('click', () => {
      options.onCancel?.();
    });

    contenedor.appendChild(icono);
    contenedor.appendChild(texto);
    contenedor.appendChild(stopBtn);

    return contenedor;
  }

  function scrollAlFinal(): void {
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }

  // ===== API pública =====

  function mostrar(resultado: RunResult): void {
    body.innerHTML = '';

    if (resultado.logs.length === 0 && !resultado.error) {
      body.appendChild(crearLineaInfo('(sin salida)'));
    }

    for (const log of resultado.logs) {
      body.appendChild(crearLinea(log));
    }

    if (resultado.error) {
      body.appendChild(
        crearLineaError(resultado.error.message, resultado.error.stack)
      );
    } else {
      body.appendChild(
        crearLineaInfo(`✓ Terminado en ${resultado.durationMs} ms`)
      );
    }

    scrollAlFinal();
  }

  function agregar(log: RunLog): void {
    body.appendChild(crearLinea(log));
    scrollAlFinal();
  }

  function mostrarEjecutando(): void {
    body.innerHTML = '';
    body.appendChild(crearLineaEjecutando());
  }

  function mostrarError(mensaje: string): void {
    body.innerHTML = '';
    body.appendChild(crearLineaError(mensaje));
  }

  function abrir(): void {
    el.classList.add('is-visible');
  }

  function cerrar(): void {
    el.classList.remove('is-visible');
    options.onClose?.();
  }

  function limpiar(): void {
    body.innerHTML = '';
  }

  function estaVisible(): boolean {
    return el.classList.contains('is-visible');
  }

  // ===== Eventos =====
  restartBtn.addEventListener('click', () => {
    options.onRestart?.();
  });

  clearBtn.addEventListener('click', () => limpiar());
  closeBtn.addEventListener('click', () => cerrar());

  return {
    el,
    mostrar,
    agregar,
    mostrarEjecutando,
    mostrarError,
    abrir,
    cerrar,
    limpiar,
    estaVisible,
  };
}
