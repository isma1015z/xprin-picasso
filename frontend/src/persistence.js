import { get, set, del } from 'idb-keyval';

const STORE_NAME = 'xprin-picasso-state';

/**
 * Guarda el estado en IndexedDB.
 */
export async function saveState(state) {
  try {
    const stateToSave = {
      proyectoId: state.proyectoId,
      savedProfileId: state.savedProfileId ?? null,
      proyectoNombre: state.proyectoNombre,
      imagenUrl: state.imagenUrl,
      imagenSize: state.imagenSize,
      capas: state.capas,
      settings: state.settings,
      spotChannels: state.spotChannels,
      lastActivity: Date.now(),
    };
    
    await set(STORE_NAME, stateToSave);
  } catch (error) {
    console.error('Error saving state to IndexedDB:', error);
  }
}

let saveTimeout = null;
/**
 * Versión debounced de saveState.
 */
export function saveStateDebounced(state) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveState(state);
    saveTimeout = null;
  }, 1000); // 1s de calma
}

/**
 * Guarda un archivo (Blob/File) en IndexedDB.
 */
export async function saveFile(file) {
  try {
    await set('xprin-last-file', file);
  } catch (error) {
    console.error('Error saving file to IndexedDB:', error);
  }
}

/**
 * Recupera el archivo guardado.
 */
export async function getSavedFile() {
  try {
    return await get('xprin-last-file');
  } catch (error) {
    return null;
  }
}

/**
 * Carga el estado desde IndexedDB.
 */
export async function loadState() {
  try {
    return await get(STORE_NAME);
  } catch (error) {
    return null;
  }
}

/**
 * Limpia el estado persistido (Borrado total).
 */
export async function clearPersistedState() {
  try {
    await del(STORE_NAME);
    await del('xprin-last-file');
    console.log('IndexedDB limpieado por completo.');
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
}
