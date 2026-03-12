import { create } from 'zustand'
import { saveState, loadState, saveFile, getSavedFile, clearPersistedState, saveStateDebounced } from './persistence'

const DEFAULT_SETTINGS = {
  remove_bg:   true,
  n_colores:   0,
  min_area:    400,
  gauss_sigma: 1.5,
  delta_e:     12.0,
}

const SPOT_COLORS = [
  '#a0a0ab', '#7b8cde', '#f0b429', '#7bdec4',
  '#e07b29', '#9b7de2', '#29b4e0', '#de7ba0',
  '#29e066', '#a0e029', '#de9b7b', '#e029c4',
]

// Canal: { id, index, color, label, inkAmount }
// Todos los spots pueden llevar textura — el campo textura vive en capa.spots[].texturaId
// Nombre en PDF: "SPOT_1_Brillante_80%" o "SPOT_1_100%"
export const DEFAULT_SPOT_CHANNELS = [
  { id: 'SPOT_1', index: 1, color: SPOT_COLORS[0], label: '', inkAmount: 100 },
  { id: 'SPOT_2', index: 2, color: SPOT_COLORS[1], label: '', inkAmount: 100 },
]

export function channelFullName(ch) {
  const lbl = ch.label?.trim()
  return lbl
    ? `${ch.id}_${lbl}_${ch.inkAmount}%`
    : `${ch.id}_${ch.inkAmount}%`
}

export function getCapaSpot(capa, channelId) {
  return (capa.spots ?? []).find((s) => s.channelId === channelId)
}

export function capaHasChannel(capa, channelId) {
  return (capa.spots ?? []).some((s) => s.channelId === channelId)
}

// Siguiente índice libre (no falla si se han eliminado canales intermedios)
function _nextIndex(spotChannels) {
  if (spotChannels.length === 0) return 1
  return Math.max(...spotChannels.map((c) => c.index)) + 1
}

function _uniqueId(spotChannels) {
  let idx = _nextIndex(spotChannels)
  let id  = `SPOT_${idx}`
  while (spotChannels.some((c) => c.id === id)) { idx++; id = `SPOT_${idx}` }
  return { id, index: idx }
}

export const useStore = create((set, get) => ({

  proyectoId:     null,
  savedProfileId: null,
  proyectoNombre: '',
  imagenUrl:      null,
  imagenSize:     { ancho: 0, alto: 0 },
  capas:          [],
  capaActivaId:   null,
  lastFile:       null,

  // Canales spot del proyecto: { id, index, color, label, inkAmount }
  spotChannels: [...DEFAULT_SPOT_CHANNELS],

  settings:      { ...DEFAULT_SETTINGS },
  settingsOpen:  false,
  cargando:      false,
  errorMsg:      null,
  exportandoPDF: false,
  hydrated:      false,

  // ── Persistencia ──────────────────────────────────────────────────────────

  hydrate: async () => {
    try {
      const savedState = await loadState()
      const savedFile  = await getSavedFile()
      if (savedState) {
        let imagenUrl    = savedState.imagenUrl
        if (savedFile)    imagenUrl = URL.createObjectURL(savedFile)
        const spotChannels = (savedState.spotChannels ?? [...DEFAULT_SPOT_CHANNELS]).map(_migrarChannel)
        set({ ...savedState, imagenUrl, lastFile: savedFile, hydrated: true, spotChannels })
      } else {
        set({ hydrated: true })
      }
    } catch (error) {
      console.error('Error hydrating editor state:', error)
      set({ hydrated: true })
    }
  },

  // ── Proyecto ──────────────────────────────────────────────────────────────

  setProyecto: async ({ proyectoId, nombre, imagenUrl, ancho, alto, capas }) => {
    const capasMigradas = capas.map(_migrarCapa)
    set({
      proyectoId,
      savedProfileId: null,
      proyectoNombre: nombre,
      imagenUrl,
      imagenSize:     { ancho, alto },
      capas:          capasMigradas,
      capaActivaId:   capasMigradas.length > 0 ? capasMigradas[0].id : null,
      errorMsg:       null,
      spotChannels:   [...DEFAULT_SPOT_CHANNELS],
    })
    await saveState(get())
  },

  cargarProyectoGuardado: async (savedProject) => {
    const snapshot = savedProject?.snapshot
    if (!snapshot?.project) return

    const p             = snapshot.project
    const imagenDataUrl = snapshot.imagenDataUrl ?? null
    let restoredFile    = null

    if (imagenDataUrl) {
      try {
        const blob   = await fetch(imagenDataUrl).then((r) => r.blob())
        restoredFile = new File([blob], `${p.nombre || 'proyecto'}.png`, { type: blob.type || 'image/png' })
      } catch { restoredFile = null }
    }

    const capasMigradas = (p.capas ?? []).map(_migrarCapa)
    const spotChannels  = (p.spotChannels ?? [...DEFAULT_SPOT_CHANNELS]).map(_migrarChannel)
    set({
      proyectoId:     p.id ?? crypto.randomUUID(),
      savedProfileId: savedProject?.id ?? null,
      proyectoNombre: p.nombre ?? 'Proyecto',
      imagenUrl:      imagenDataUrl,
      imagenSize:     { ancho: p.documento?.ancho ?? 0, alto: p.documento?.alto ?? 0 },
      capas:          capasMigradas,
      capaActivaId:   capasMigradas[0]?.id ?? null,
      lastFile:       restoredFile,
      errorMsg:       null,
      spotChannels,
    })

    if (restoredFile) await saveFile(restoredFile)
    await saveState(get())
  },

  // ── Canales spot ──────────────────────────────────────────────────────────

  addSpotChannel: () => {
    const { spotChannels } = get()
    const { id, index }    = _uniqueId(spotChannels)
    const color            = SPOT_COLORS[(index - 1) % SPOT_COLORS.length]
    set({ spotChannels: [...spotChannels, { id, index, color, label: '', inkAmount: 100 }] })
    saveStateDebounced(get())
  },

  removeSpotChannel: (channelId) => {
    const { spotChannels, capas } = get()
    if (spotChannels.length <= 1) return  // mínimo 1 spot total
    set({
      spotChannels: spotChannels.filter((c) => c.id !== channelId),
      capas: capas.map((capa) => ({
        ...capa,
        spots: (capa.spots ?? []).filter((s) => s.channelId !== channelId),
      })),
    })
    saveStateDebounced(get())
  },

  updateSpotChannel: (channelId, patch) => {
    set((s) => ({
      spotChannels: s.spotChannels.map((ch) =>
        ch.id === channelId ? { ...ch, ...patch } : ch
      ),
    }))
    saveStateDebounced(get())
  },

  // Activa/desactiva un canal en una capa
  toggleCapaSpot: (capaId, channelId) => {
    const { capas } = get()
    set({
      capas: capas.map((capa) => {
        if (capa.id !== capaId) return capa
        const spots  = capa.spots ?? []
        const exists = spots.some((s) => s.channelId === channelId)
        if (exists) {
          return { ...capa, spots: spots.filter((s) => s.channelId !== channelId) }
        }
        // Nuevo spot — incluye campos de textura opcionales
        return {
          ...capa,
          spots: [...spots, { channelId, texturaId: null, texturaSvg: null, tileSize: 80, tileGap: 0 }],
        }
      }),
    })
    saveStateDebounced(get())
  },

  // Asigna textura a un spot de una capa
  asignarTexturaASpot: (capaId, channelId, texturaId, texturaSvg) => {
    set((s) => ({
      capas: s.capas.map((capa) => {
        if (capa.id !== capaId) return capa
        const spots  = capa.spots ?? []
        const exists = spots.some((sp) => sp.channelId === channelId)
        if (exists) {
          return {
            ...capa,
            spots: spots.map((sp) =>
              sp.channelId === channelId ? { ...sp, texturaId, texturaSvg } : sp
            ),
          }
        }
        return {
          ...capa,
          spots: [...spots, { channelId, texturaId, texturaSvg, tileSize: 80, tileGap: 0 }],
        }
      }),
    }))
    saveStateDebounced(get())
  },

  // Quita la textura de un spot (mantiene el spot activo, solo borra textura)
  quitarTexturaDeSpot: (capaId, channelId) => {
    set((s) => ({
      capas: s.capas.map((capa) => {
        if (capa.id !== capaId) return capa
        return {
          ...capa,
          spots: (capa.spots ?? []).map((sp) =>
            sp.channelId === channelId
              ? { ...sp, texturaId: null, texturaSvg: null }
              : sp
          ),
        }
      }),
    }))
    saveStateDebounced(get())
  },

  asignarTileConfigASpot: (capaId, channelId, { tileSize, tileGap }) => {
    set((s) => ({
      capas: s.capas.map((capa) => {
        if (capa.id !== capaId) return capa
        return {
          ...capa,
          spots: (capa.spots ?? []).map((sp) =>
            sp.channelId === channelId
              ? { ...sp, tileSize: tileSize ?? sp.tileSize, tileGap: tileGap ?? sp.tileGap }
              : sp
          ),
        }
      }),
    }))
    saveStateDebounced(get())
  },

  asignarReliefLayer: (capaId, reliefLayers) => {
    set((s) => ({
      capas: s.capas.map((c) => c.id === capaId ? { ...c, reliefLayers } : c),
    }))
    saveStateDebounced(get())
  },

  toggleVisible: (capaId) => {
    set((s) => ({
      capas: s.capas.map((c) => c.id === capaId ? { ...c, visible: !c.visible } : c),
    }))
    saveStateDebounced(get())
  },

  // ── Básicas ───────────────────────────────────────────────────────────────

  setCapaActiva:     (id)  => set({ capaActivaId: id }),
  setSavedProfileId: (id)  => set({ savedProfileId: id }),

  setProyectoNombre: (nombre) => {
    set({ proyectoNombre: nombre })
    saveStateDebounced(get())
  },

  setSetting: (k, v) => {
    set((s) => ({ settings: { ...s.settings, [k]: v } }))
    saveStateDebounced(get())
  },

  resetSettings: () => {
    set({ settings: { ...DEFAULT_SETTINGS } })
    saveStateDebounced(get())
  },

  setCargando:      (v)   => set({ cargando: v }),
  setExportandoPDF: (v)   => set({ exportandoPDF: v }),
  setError:         (msg) => set({ errorMsg: msg }),
  setSettingsOpen:  (v)   => set({ settingsOpen: v }),

  setLastFile: async (file) => {
    set({ lastFile: file })
    if (file) await saveFile(file)
  },

  resetEditor: async () => {
    set({
      proyectoId: null, savedProfileId: null, proyectoNombre: '', imagenUrl: null,
      imagenSize: { ancho: 0, alto: 0 }, capas: [], capaActivaId: null,
      cargando: false, errorMsg: null, exportandoPDF: false, lastFile: null,
      spotChannels: [...DEFAULT_SPOT_CHANNELS],
    })
    await clearPersistedState()
  },

  getProyectoJSON: () => {
    const s = get()
    return {
      version:      '1.0',
      id:           s.proyectoId,
      nombre:       s.proyectoNombre,
      spotChannels: s.spotChannels,
      documento:    { ancho: s.imagenSize.ancho, alto: s.imagenSize.alto, unidad: 'px', resolucion: 72 },
      capas:        s.capas,
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

// ── Migración backward compat ─────────────────────────────────────────────

function _migrarCapa(capa) {
  if (Array.isArray(capa.spots)) {
    // Asegurar que cada spot tiene campos de textura
    return {
      ...capa,
      spots: capa.spots.map((sp) => ({
        texturaId:  null,
        texturaSvg: null,
        tileSize:   80,
        tileGap:    0,
        ...sp,
        // Normalizar channelIds viejos (W1→SPOT_1, W2→SPOT_2, TEXTURE1→SPOT_1)
        channelId: _normalizeChannelId(sp.channelId),
      })),
    }
  }

  // Formato muy viejo (capa.spot string)
  const spots = []
  const base  = { texturaId: null, texturaSvg: null, tileSize: 80, tileGap: 0 }
  if (capa.spot === 'w1' || capa.spot === 'w2') {
    spots.push({ ...base, channelId: capa.spot === 'w1' ? 'SPOT_1' : 'SPOT_2' })
  }
  if (capa.spot === 'texture') {
    spots.push({
      channelId:  'SPOT_1',
      texturaId:  capa.texturaId  ?? null,
      texturaSvg: capa.texturaSvg ?? null,
      tileSize:   capa.tileSize   ?? 80,
      tileGap:    capa.tileGap    ?? 0,
    })
  }

  const { spot, texturaId, texturaSvg, texturaDisp, tileSize, tileGap, ...rest } = capa
  return { ...rest, spots }
}

function _normalizeChannelId(id) {
  if (!id) return 'SPOT_1'
  if (id === 'W1' || id === 'TEXTURE1') return 'SPOT_1'
  if (id === 'W2') return 'SPOT_2'
  if (id === 'W3') return 'SPOT_3'
  // Si ya es SPOT_N, dejarlo
  if (id.startsWith('SPOT_')) return id
  return id
}

function _migrarChannel(ch) {
  // Normalizar canales viejos con type W/TEXTURE
  const id = ch.id?.startsWith('SPOT_') ? ch.id
    : ch.id === 'W1' ? 'SPOT_1'
    : ch.id === 'W2' ? 'SPOT_2'
    : ch.id === 'TEXTURE1' ? 'SPOT_1'
    : ch.id ?? 'SPOT_1'

  return {
    label:     '',
    inkAmount: 100,
    ...ch,
    id,
    // Quitar campo type que ya no existe
    type: undefined,
  }
}
