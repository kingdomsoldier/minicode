// minicode - preferencias de UI persistentes en localStorage

const STORAGE_KEY = 'minicode:ui-prefs';
const STORAGE_VERSION = 1;

interface UIPreferences {
  /** ¿Se muestra la barra de acciones superior? */
  actionsVisible: boolean;
}

const DEFAULTS: UIPreferences = {
  actionsVisible: true,
};

let cache: UIPreferences | null = null;

// ===== Persistencia =====

function cargarDeStorage(): UIPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== STORAGE_VERSION) return { ...DEFAULTS };

    return {
      actionsVisible:
        typeof parsed.data?.actionsVisible === 'boolean'
          ? parsed.data.actionsVisible
          : DEFAULTS.actionsVisible,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function guardarEnStorage(prefs: UIPreferences): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: STORAGE_VERSION, data: prefs })
    );
  } catch (err) {
    console.warn('[uiPrefs] no se pudo guardar', err);
  }
}

function obtener(): UIPreferences {
  if (!cache) cache = cargarDeStorage();
  return cache;
}

// ===== API pública =====

export function getActionsVisible(): boolean {
  return obtener().actionsVisible;
}

export function setActionsVisible(visible: boolean): void {
  const prefs = obtener();
  if (prefs.actionsVisible === visible) return;
  prefs.actionsVisible = visible;
  guardarEnStorage(prefs);
}

export function toggleActionsVisible(): boolean {
  const nuevo = !obtener().actionsVisible;
  setActionsVisible(nuevo);
  return nuevo;
}
