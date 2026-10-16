// minicode - comandos de gestión de archivos/carpetas

import { serverFS } from '../../files/serverFS.js';
import * as files from '../../state/files.js';
import type { FileBrowserInstance, FileEntry } from '../../ui/fileBrowser.js';

export async function renombrarItem(item: FileEntry): Promise<void> {
  const nuevoNombre = window.prompt(
    `Nuevo nombre para "${item.name}":`,
    item.name
  );

  if (!nuevoNombre) return;
  const limpio = nuevoNombre.trim();
  if (!limpio || limpio === item.name) return;

  const partes = item.path.split('/');
  partes[partes.length - 1] = limpio;
  const nuevaRuta = partes.join('/');

  try {
    await serverFS.rename(item.path, nuevaRuta);
    actualizarRutasAbiertas(item.path, nuevaRuta);
  } catch (err: any) {
    window.alert('Error al renombrar: ' + err.message);
  }
}

export async function copiarItem(
  item: FileEntry,
  fileBrowser: FileBrowserInstance
): Promise<void> {
  const destino = await fileBrowser.pickDestinationFolder('.');
  if (!destino) return;

  const nuevaRuta = destino === '.'
    ? item.name
    : `${destino}/${item.name}`;

  try {
    await serverFS.copy(item.path, nuevaRuta);
  } catch (err: any) {
    window.alert('Error al copiar: ' + err.message);
  }
}

export async function moverItem(
  item: FileEntry,
  fileBrowser: FileBrowserInstance
): Promise<void> {
  const destino = await fileBrowser.pickDestinationFolder('.');
  if (!destino) return;

  const nuevaRuta = destino === '.'
    ? item.name
    : `${destino}/${item.name}`;

  try {
    await serverFS.rename(item.path, nuevaRuta);
    actualizarRutasAbiertas(item.path, nuevaRuta);
  } catch (err: any) {
    window.alert('Error al mover: ' + err.message);
  }
}

export async function eliminarItem(item: FileEntry): Promise<void> {
  const esCarpeta = item.type === 'directory';
  const mensaje = esCarpeta
    ? `¿Eliminar la carpeta "${item.name}" y todo su contenido?\n\nEsta acción no se puede deshacer.`
    : `¿Eliminar "${item.name}" del disco?\n\nEsta acción no se puede deshacer.`;

  if (!window.confirm(mensaje)) return;

  try {
    await serverFS.delete(item.path);

    const state = files.getState();
    for (const f of state.files) {
      if (!f.path) continue;
      if (f.path === item.path || f.path.startsWith(item.path + '/')) {
        files.cerrarArchivo(f.id);
      }
    }
  } catch (err: any) {
    window.alert('Error al eliminar: ' + err.message);
  }
}

// ===== Helper: actualizar rutas de tabs abiertos =====
function actualizarRutasAbiertas(rutaVieja: string, rutaNueva: string): void {
  const state = files.getState();

  for (const f of state.files) {
    if (!f.path) continue;

    if (f.path === rutaVieja) {
      files.actualizarArchivo(f.id, { path: rutaNueva });
    } else if (f.path.startsWith(rutaVieja + '/')) {
      const sufijo = f.path.slice(rutaVieja.length);
      files.actualizarArchivo(f.id, { path: rutaNueva + sufijo });
    }
  }
}
