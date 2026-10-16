// minicode - cliente del sistema de archivos del servidor

import type {
  FileSystemProvider,
  DirListing,
  FileContent,
  SystemListing,
  PathSuggestion,
} from './provider.js';

async function peticion<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Respuesta inválida del servidor (${res.status})`);
  }

  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }

  return data as T;
}

export const serverFS: FileSystemProvider = {
  async list(path: string): Promise<DirListing> {
    return peticion<DirListing>(
      `/api/files/list?path=${encodeURIComponent(path)}`
    );
  },

  async read(path: string): Promise<FileContent> {
    return peticion<FileContent>(
      `/api/files/read?path=${encodeURIComponent(path)}`
    );
  },

  async write(path: string, content: string): Promise<void> {
    await peticion('/api/files/write', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
  },

  async create(
    path: string,
    content = ''
  ): Promise<{ path: string; name: string }> {
    return peticion('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
  },

  async mkdir(path: string): Promise<{ path: string; name: string }> {
    return peticion('/api/files/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  },

  async delete(path: string): Promise<void> {
    await peticion(`/api/files/delete?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  },

  async rename(
    from: string,
    to: string
  ): Promise<{ path: string; name: string }> {
    return peticion('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
    });
  },

  async copy(
    from: string,
    to: string
  ): Promise<{ path: string; name: string }> {
    return peticion('/api/files/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to }),
    });
  },

  async systemBrowse(path?: string): Promise<SystemListing> {
    const qs = path ? `?path=${encodeURIComponent(path)}` : '';
    return peticion<SystemListing>(`/api/system/browse${qs}`);
  },

  async systemSuggestions(): Promise<PathSuggestion[]> {
    const data = await peticion<{ suggestions: PathSuggestion[] }>(
      '/api/system/suggestions'
    );
    return data.suggestions;
  },

  async getRootDir(): Promise<string> {
    const data = await peticion<{ rootDir: string }>('/api/config/root');
    return data.rootDir;
  },

  async setRootDir(path: string): Promise<string> {
    const data = await peticion<{ rootDir: string }>('/api/config/root', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    return data.rootDir;
  },
};
