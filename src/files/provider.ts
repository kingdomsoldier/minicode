// minicode - interfaz abstracta de sistema de archivos

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

export interface DirListing {
  path: string;
  parent: string | null;
  items: FileEntry[];
}

export interface SystemListing {
  absolutePath: string;
  parent: string | null;
  items: FileEntry[];
}

export interface PathSuggestion {
  label: string;
  path: string;
}

export interface FileContent {
  path: string;
  name: string;
  size: number;
  content: string;
}

export interface FileSystemProvider {
  // Proyecto
  list(path: string): Promise<DirListing>;
  read(path: string): Promise<FileContent>;
  write(path: string, content: string): Promise<void>;
  create(path: string, content?: string): Promise<{ path: string; name: string }>;
  mkdir(path: string): Promise<{ path: string; name: string }>;
  delete(path: string): Promise<void>;
  rename(from: string, to: string): Promise<{ path: string; name: string }>;
  copy(from: string, to: string): Promise<{ path: string; name: string }>;

  // Sistema
  systemBrowse(path?: string): Promise<SystemListing>;
  systemSuggestions(): Promise<PathSuggestion[]>;

  // Config
  getRootDir(): Promise<string>;
  setRootDir(path: string): Promise<string>;
}
