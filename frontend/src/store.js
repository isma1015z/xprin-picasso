import { create } from 'zustand'

const DEFAULT_SETTINGS = {
  remove_bg:   true,
  n_colores:   0,       // 0 = automático
  min_area:    400,
  gauss_sigma: 1.5,     // suavizado gaussiano
  delta_e:     12.0,    // fusión capas similares
}

export const useStore = create((set, get) => ({

  proyectoId:     null,
  proyectoNombre: '',
  imagenUrl:      null,
  imagenSize:     { ancho: 0, alto: 0 },
  capas:          [],
  capaActivaId:   null,

  settings:     { ...DEFAULT_SETTINGS },
  settingsOpen: false,

  cargando:      false,
  errorMsg:      null,
  exportandoPDF: false,

  // ── Acciones ──────────────────────────────────────────────────────────────

  setProyecto: ({ proyectoId, nombre, imagenUrl, ancho, alto, capas }) =>
    set({
      proyectoId,
      proyectoNombre: nombre,
      imagenUrl,
      imagenSize: { ancho, alto },
      capas,
      capaActivaId: capas.length > 0 ? capas[0].id : null,
      errorMsg: null,
    }),

  setCapaActiva:  (id)  => set({ capaActivaId: id }),
  setSetting:     (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),
  resetSettings:  ()    => set({ settings: { ...DEFAULT_SETTINGS } }),
  setCargando:    (v)   => set({ cargando: v }),
  setExportandoPDF:(v)  => set({ exportandoPDF: v }),
  setError:       (msg) => set({ errorMsg: msg }),
  setSettingsOpen:(v)   => set({ settingsOpen: v }),

  asignarSpot: (capaId, spot) =>
    set((s) => ({ capas: s.capas.map((c) => c.id === capaId ? { ...c, spot } : c) })),


  // ── Asignar textura ────────────────────────────────────────────────────────
  asignarTextura: (capaId, texturaId, texturaDisp) =>
    set((s) => ({
      // 1. Asignar spot 'texture' a la capa
      capas: s.capas.map((c) =>
        // 2. Si la capa ya tiene un spot, lo quitamos
        c.id === capaId ? { ...c, spot: 'texture', texturaId, texturaDisp } : c
      ),
    })),

  toggleVisible: (capaId) =>
    set((s) => ({ capas: s.capas.map((c) => c.id === capaId ? { ...c, visible: !c.visible } : c) })),

  resetEditor: () => set({
    proyectoId: null, proyectoNombre: '', imagenUrl: null,
    imagenSize: { ancho: 0, alto: 0 }, capas: [], capaActivaId: null,
    cargando: false, errorMsg: null, exportandoPDF: false,
  }),

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
