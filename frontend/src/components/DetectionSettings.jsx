// Panel de ajustes de detección — v8 simplificado
import { useEffect, useRef } from 'react'
import { useStore } from '../store'

function Slider({ label, hint, min, max, step, value, onChange, left, right }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-gray-700">{label}</span>
        <span className="text-[11px] font-mono text-red-700">{value}</span>
      </div>
      {hint && <p className="text-[10px] text-gray-400 -mt-0.5">{hint}</p>}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-gray-400 w-5">{left}</span>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 accent-red-600"
        />
        <span className="text-[10px] text-gray-400 w-5 text-right">{right}</span>
      </div>
    </div>
  )
}

export function DetectionSettings() {
  const { settings, setSetting, resetSettings, settingsOpen, setSettingsOpen } = useStore()
  const ref = useRef(null)
  const s   = settings

  useEffect(() => {
    if (!settingsOpen) return
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setSettingsOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [settingsOpen, setSettingsOpen])

  return (
    <div className="relative" ref={ref}>
      {/* Botón */}
      <button
        onClick={() => setSettingsOpen(!settingsOpen)}
        title="Ajustes de detección"
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded font-medium transition-colors
          ${settingsOpen ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
      >
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${settingsOpen ? 'rotate-45' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Detección
      </button>

      {/* Panel */}
      {settingsOpen && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700">Ajustes de detección</span>
            <button onClick={resetSettings} className="text-[10px] text-gray-400 hover:text-red-600">
              Restaurar
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">

            {/* Eliminar fondo */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-gray-700">Eliminar fondo</p>
                <p className="text-[10px] text-gray-400">rembg AI</p>
              </div>
              <button
                onClick={() => setSetting('remove_bg', !s.remove_bg)}
                className={`relative h-5 w-9 rounded-full transition-colors ${s.remove_bg ? 'bg-red-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${s.remove_bg ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Suavizado */}
            <Slider
              label="Suavizado"
              hint="Gaussian sigma — suaviza bordes antes de vectorizar"
              min={0.5} max={3.0} step={0.5}
              value={s.gauss_sigma}
              onChange={(v) => setSetting('gauss_sigma', v)}
              left="0.5" right="3"
            />

            {/* Colores */}
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold text-gray-700">Nº de colores</span>
                <span className="text-[11px] font-mono text-red-700">{s.n_colores === 0 ? 'auto' : s.n_colores}</span>
              </div>
              <p className="text-[10px] text-gray-400 -mt-0.5">0 = detección automática</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 w-5">0</span>
                <input
                  type="range" min={0} max={14} step={1} value={s.n_colores}
                  onChange={(e) => setSetting('n_colores', Number(e.target.value))}
                  className="flex-1 h-1.5 accent-red-600"
                />
                <span className="text-[10px] text-gray-400 w-5 text-right">14</span>
              </div>
            </div>

            {/* Fusión */}
            <Slider
              label="Fusión de colores (ΔE)"
              hint="Agrupa capas con colores similares"
              min={5} max={30} step={1}
              value={s.delta_e}
              onChange={(v) => setSetting('delta_e', v)}
              left="5" right="30"
            />

            {/* Área mínima */}
            <Slider
              label="Área mínima"
              hint="Ignora manchas pequeñas (px²)"
              min={100} max={2000} step={100}
              value={s.min_area}
              onChange={(v) => setSetting('min_area', v)}
              left="100" right="2k"
            />

          </div>

          <div className="px-4 py-2 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-xs text-red-700 font-medium hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
