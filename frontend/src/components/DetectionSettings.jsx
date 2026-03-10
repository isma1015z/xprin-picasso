// Panel de ajustes de detección — estilo Prueba_EditorPicasso
import { useEffect, useRef } from 'react'
import { Settings2 } from 'lucide-react'
import { useStore } from '../store'

function Slider({ label, hint, min, max, step, value, onChange, left, right }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-primary">{label}</span>
        <span className="text-[12px] font-mono text-accent">{value}</span>
      </div>
      {hint && <p className="text-[11px] text-muted -mt-0.5">{hint}</p>}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted w-5">{left}</span>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 accent-red-600 cursor-pointer"
        />
        <span className="text-[11px] text-muted w-5 text-right">{right}</span>
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
      <button
        onClick={() => setSettingsOpen(!settingsOpen)}
        title="Ajustes de detección"
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border
          transition-all duration-200 cursor-pointer
          ${settingsOpen
            ? 'bg-accent/8 border-accent/30 text-accent'
            : 'bg-surface-elevated border-border-light text-secondary hover:bg-surface-hover hover:text-primary hover:border-border-strong'
          }`}
      >
        <Settings2 size={15} className={settingsOpen ? 'text-accent' : ''} />
        Detección
      </button>

      {settingsOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-surface rounded-xl shadow-2xl border border-border-strong overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-surface-elevated">
            <span className="text-[13px] font-semibold text-primary">Ajustes de detección</span>
            <button
              onClick={resetSettings}
              className="text-[11px] text-muted hover:text-accent transition-colors"
            >
              Restaurar
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">

            {/* Eliminar fondo */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-primary">Eliminar fondo</p>
                <p className="text-[11px] text-muted">rembg AI background removal</p>
              </div>
              <button
                onClick={() => setSetting('remove_bg', !s.remove_bg)}
                className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${s.remove_bg ? 'bg-accent' : 'bg-surface-elevated border border-border-strong'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${s.remove_bg ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="border-t border-border-light" />

            <Slider
              label="Suavizado gaussiano"
              hint="Suaviza bordes antes de vectorizar"
              min={0.5} max={3.0} step={0.5}
              value={s.gauss_sigma}
              onChange={(v) => setSetting('gauss_sigma', v)}
              left="0.5" right="3"
            />

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-medium text-primary">Nº de colores</span>
                <span className="text-[12px] font-mono text-accent">{s.n_colores === 0 ? 'auto' : s.n_colores}</span>
              </div>
              <p className="text-[11px] text-muted -mt-0.5">0 = detección automática</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted w-5">0</span>
                <input
                  type="range" min={0} max={14} step={1} value={s.n_colores}
                  onChange={(e) => setSetting('n_colores', Number(e.target.value))}
                  className="flex-1 h-1.5 accent-red-600 cursor-pointer"
                />
                <span className="text-[11px] text-muted w-5 text-right">14</span>
              </div>
            </div>

            <Slider
              label="Fusión de colores (ΔE)"
              hint="Agrupa capas con colores similares"
              min={5} max={30} step={1}
              value={s.delta_e}
              onChange={(v) => setSetting('delta_e', v)}
              left="5" right="30"
            />

            <Slider
              label="Área mínima"
              hint="Ignora manchas pequeñas (px²)"
              min={100} max={2000} step={100}
              value={s.min_area}
              onChange={(v) => setSetting('min_area', v)}
              left="100" right="2k"
            />
          </div>

          <div className="px-4 py-2.5 border-t border-border-light bg-surface-elevated flex justify-between items-center">
            <span className="text-[11px] text-muted">Se aplican en la próxima detección</span>
            <button onClick={() => setSettingsOpen(false)} className="text-[12px] text-accent hover:underline font-medium">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
