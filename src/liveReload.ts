// minicode - cliente de live reload
// Escucha al servidor y recarga la página cuando hay cambios

interface ReloadMessage {
  type: 'reload';
  file: string;
}

export function iniciarLiveReload(): void {
  const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocolo}//${location.host}`;

  let ws: WebSocket | null = null;
  let reintento = 0;

  const conectar = () => {
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.warn('[live reload] no se pudo conectar', err);
      return;
    }

    ws.addEventListener('open', () => {
      console.log('[live reload] conectado');
      reintento = 0;
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg: ReloadMessage = JSON.parse(event.data);
        if (msg.type === 'reload') {
          console.log(`[live reload] recargando por cambio en: ${msg.file}`);
          location.reload();
        }
      } catch (err) {
        // ignorar mensajes malformados
      }
    });

    ws.addEventListener('close', () => {
      const espera = Math.min(1000 * 2 ** reintento, 30000);
      reintento++;
      setTimeout(conectar, espera);
    });

    ws.addEventListener('error', () => {
      ws?.close();
    });
  };

  conectar();
}
