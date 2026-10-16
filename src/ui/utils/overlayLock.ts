// minicode - bloquea el scroll del body cuando hay un overlay abierto

/**
 * Contador de overlays abiertos.
 * Si hay varios simultáneos (poco probable, pero posible),
 * solo se libera cuando el último se cierra.
 */
let contador = 0;

function aplicarAlDOM(): void {
  if (contador > 0) {
    document.body.classList.add('has-overlay-open');
  } else {
    document.body.classList.remove('has-overlay-open');
  }
}

/**
 * Bloquea el scroll del body. Devuelve una función para desbloquear.
 */
export function bloquearScrollBody(): () => void {
  contador++;
  aplicarAlDOM();

  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    contador = Math.max(0, contador - 1);
    aplicarAlDOM();
  };
}
