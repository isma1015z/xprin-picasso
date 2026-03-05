import { create } from 'zustand'

// Estado global del editor
// Responsable: Andrea + Alejandro

export const useStore = create((set) => ({
  // Zona actualmente seleccionada en el canvas
  zonaActiva: null,

  // Spot activo: 'white_base' | 'white_relieve' | 'varnish' | 'cmyk'
  spotActivo: 'varnish',

  // Textura seleccionada para el spot activo
  texturaActiva: null,

  // Lista de zonas dibujadas en el canvas
  zonas: [],

  // Historial para deshacer/rehacer (max 20 pasos)
  historial: [],

  // Acciones
  setZonaActiva:   (zona)    => set({ zonaActiva: zona }),
  setSpotActivo:   (spot)    => set({ spotActivo: spot }),
  setTexturaActiva:(textura) => set({ texturaActiva: textura }),

  addZona: (zona) => set((state) => ({
    zonas: [...state.zonas, zona]
  })),

  removeZona: (id) => set((state) => ({
    zonas: state.zonas.filter((z) => z.id !== id)
  })),

  resetEditor: () => set({
    zonaActiva: null,
    spotActivo: 'varnish',
    texturaActiva: null,
    zonas: [],
    historial: [],
  }),
}))
