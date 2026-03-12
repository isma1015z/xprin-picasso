import { create } from 'zustand'
import { saveState, loadState, saveFile, getSavedFile, clearPersistedState, saveStateDebounced } from './persistence'

const DEFAULT_SETTINGS = {
  remove_bg:   true,
  n_colores:   0,
  min_area:    400,
  gauss_sigma: 1.5,
  delta_e:     12.0,
}

export const useStore = create((set, get) => ({

  proyectoId:     null,
  savedProfileId: null,
  proyectoNombre: '',
  imagenUrl:      null,
  imagenSize:     { ancho: 0, alto: 0 },
  capas:          [],
  capaActivaId:   null,

  lastFile:      null,   // File object del último upload — para re-detección

  settings:      { ...DEFAULT_SETTINGS },
  settingsOpen:  false,
  cargando:      false,
  errorMsg:      null,
  exportandoPDF: false,
  hydrated:      false, // Control de si ya se cargó de IndexedDB

  // ── Acciones de Persistencia ──────────────────────────────────────────────

  hydrate: async () => {
    const savedState = await loadState();
    const savedFile = await getSavedFile();
    
    if (savedState) {
      // Re-crear el ObjectURL para la imagen si el blob existe
      let imagenUrl = savedState.imagenUrl;
      if (savedFile) {
        imagenUrl = URL.createObjectURL(savedFile);
      }

      set({
        ...savedState,
        imagenUrl,
        lastFile: savedFile,
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },

  // ── Acciones básicas ──────────────────────────────────────────────────────

  setProyecto: async ({ proyectoId, nombre, imagenUrl, ancho, alto, capas }) => {
    set({
      proyectoId,
      savedProfileId: null,
      proyectoNombre: nombre,
      imagenUrl,
      imagenSize: { ancho, alto },
      capas,
      capaActivaId: capas.length > 0 ? capas[0].id : null,
      errorMsg: null,
    });
    // Proyecto nuevo: guardar inmediatamente
    await saveState(get());
  },

  cargarProyectoGuardado: async (savedProject) => {
    const snapshot = savedProject?.snapshot
    if (!snapshot?.project) return

    const p = snapshot.project
    const imagenDataUrl = snapshot.imagenDataUrl ?? null
    let restoredFile = null

    if (imagenDataUrl) {
      try {
        const blob = await fetch(imagenDataUrl).then((r) => r.blob())
        restoredFile = new File([blob], `${p.nombre || 'proyecto'}.png`, { type: blob.type || 'image/png' })
      } catch {
        restoredFile = null
      }
    }

    set({
      proyectoId: p.id ?? crypto.randomUUID(),
      savedProfileId: savedProject?.id ?? null,
      proyectoNombre: p.nombre ?? 'Proyecto',
      imagenUrl: imagenDataUrl,
      imagenSize: {
        ancho: p.documento?.ancho ?? 0,
        alto: p.documento?.alto ?? 0,
      },
      capas: p.capas ?? [],
      capaActivaId: p.capas?.[0]?.id ?? null,
      lastFile: restoredFile,
      errorMsg: null,
    })

    if (restoredFile) await saveFile(restoredFile)
    await saveState(get())
  },

  setCapaActiva:    (id)   => set({ capaActivaId: id }),
  setSavedProfileId: (id)  => set({ savedProfileId: id }),

  setProyectoNombre: (nombre) => {
    set({ proyectoNombre: nombre });
    saveStateDebounced(get());
  },

  setSetting: (k, v) => {
    set((s) => ({ settings: { ...s.settings, [k]: v } }));
    saveStateDebounced(get());
  },

  resetSettings: () => {
    set({ settings: { ...DEFAULT_SETTINGS } });
    saveStateDebounced(get());
  },

  setCargando:      (v)    => set({ cargando: v }),
  setExportandoPDF: (v)    => set({ exportandoPDF: v }),
  setError:         (msg)  => set({ errorMsg: msg }),
  setSettingsOpen:  (v)    => set({ settingsOpen: v }),
  
  setLastFile:      async (file) => {
    set({ lastFile: file });
    if (file) await saveFile(file);
  },

  asignarSpot: (capaId, spot) => {
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === capaId ? { ...c, spot } : c
      ),
    }));
    saveStateDebounced(get());
  },

  asignarTextura: (capaId, texturaId, texturaDisp) => {
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === capaId
          ? { ...c, spot: 'texture', texturaId, texturaDisp, reliefLayers: c.reliefLayers || 10 }
          : c
      ),
    }));
    saveStateDebounced(get());
  },

  asignarReliefLayer: (capaId, reliefLayers) => {
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === capaId ? { ...c, reliefLayers } : c
      ),
    }));
    saveStateDebounced(get());
  },

  toggleVisible: (capaId) => {
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === capaId ? { ...c, visible: !c.visible } : c
      ),
    }));
    saveStateDebounced(get());
  },

  resetEditor: async () => {
    set({
      proyectoId: null, savedProfileId: null, proyectoNombre: '', imagenUrl: null,
      imagenSize: { ancho: 0, alto: 0 }, capas: [], capaActivaId: null,
      cargando: false, errorMsg: null, exportandoPDF: false, lastFile: null,
    });
    await clearPersistedState();
  },

  getProyectoJSON: () => {
    const s = get()
    return {
      version:   '1.0',
      id:        s.proyectoId,
      nombre:    s.proyectoNombre,
      documento: { ancho: s.imagenSize.ancho, alto: s.imagenSize.alto, unidad: 'px', resolucion: 72 },
      capas:     s.capas,
    }
  },

  buildDetectionForm: (file) => {
    const { settings: s } = get()
    const fd = new FormData()
    fd.append('imagen',      file)
    fd.append('remove_bg',   String(s.remove_bg))
    fd.append('n_colores',   String(s.n_colores))
    fd.append('min_area',    String(s.min_area))
    fd.append('gauss_sigma', String(s.gauss_sigma))
    fd.append('delta_e',     String(s.delta_e))
    return fd
  },
}))

