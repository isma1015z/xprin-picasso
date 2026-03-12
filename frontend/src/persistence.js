import { get, set, del } from 'idb-keyval';

const STORE_NAME = 'xprin-picasso-state';

/**
 * Guarda el estado en IndexedDB.
 * @param {Object} state - El estado a persistir.
 */
export async function saveState(state) {
  try {
    // No guardamos cosas temporales como cargando, errorMsg, etc.
    const stateToSave = {
      proyectoId: state.proyectoId,
      proyectoNombre: state.proyectoNombre,
      imagenUrl: state.imagenUrl, // Nota: Si es un URL de objeto, puede no persistir bien entre sesiones, pero el blob sí.
      imagenSize: state.imagenSize,
      capas: state.capas,
      settings: state.settings,
    };

    // Si tenemos la imagen original como Blob/File, es mejor guardarla directamente.
    // Pero por ahora guardaremos el estado básico. 
    // Si imagenUrl es un blob URL, necesitamos guardar el Blob original.
    
    await set(STORE_NAME, stateToSave);
  } catch (error) {
    console.error('Error saving state to IndexedDB:', error);
  }
}

let saveTimeout = null;
/**
 * Versión debounced de saveState para evitar escrituras excesivas.
 */
export function saveStateDebounced(state) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveState(state);
    saveTimeout = null;
  }, 500); // 500ms de calma antes de guardar
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
    console.error('Error getting file from IndexedDB:', error);
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
    console.error('Error loading state from IndexedDB:', error);
    return null;
  }
}

/**
 * Limpia el estado persistido.
 */
export async function clearPersistedState() {
  try {
    await del(STORE_NAME);
    await del('xprin-last-file');
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
}
