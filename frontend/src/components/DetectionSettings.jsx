// DetectionSettings — ajustes de detección con re-detección automática
import { useEffect, useRef, useCallback } from 'react'
import { Settings2, RefreshCw } from 'lucide-react'
import { useStore } from '../store'
import { useDetectar } from '../useDetectar'

const RANGE_CLASS = `
  w-full flex-1 h-1.5 rounded-full cursor-pointer appearance-none
  bg-border-strong
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:mt-[-4px]
  [&::-webkit-slider-thumb]:h-3.5
  [&::-webkit-slider-thumb]:w-3.5
  [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:bg-accent
  [&::-webkit-slider-thumb]:border
  [&::-webkit-slider-thumb]:border-white/80
  [&::-moz-range-track]:h-1.5
  [&::-moz-range-track]:rounded-full
  [&::-moz-range-track]:bg-transparent
  [&::-moz-range-thumb]:h-3.5
  [&::-moz-range-thumb]:w-3.5
  [&::-moz-range-thumb]:rounded-full
  [&::-moz-range-thumb]:bg-accent
  [&::-moz-range-thumb]:border
  [&::-moz-range-thumb]:border-white/80
`

function rangeFillStyle(min, max, value) {
  const nMin = Number(min)
  const nMax = Number(max)
  const nVal = Number(value)
  const pct = ((nVal - nMin) * 100) / (nMax - nMin || 1)
  const clamped = Math.max(0, Math.min(100, pct))
  return {
    background: `linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent) ${clamped}%, var(--color-border-strong) ${clamped}%, var(--color-border-strong) 100%)`,
  }
}

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
          className={RANGE_CLASS}
          style={rangeFillStyle(min, max, value)}
        />
        <span className="text-[11px] text-muted w-5 text-right">{right}</span>
      </div>
    </div>
  )
}

export function DetectionSettings() {
  const {
    settings, setSetting, resetSettings,
    settingsOpen, setSettingsOpen,
    lastFile, cargando,
  } = useStore()

  const { detectar } = useDetectar()
  const ref          = useRef(null)
  const debounceRef  = useRef(null)
  const s            = settings

  // Cerrar al clicar fuera
  useEffect(() => {
    if (!settingsOpen) return
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setSettingsOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [settingsOpen, setSettingsOpen])

  // Re-detección debounced: espera 800ms tras el último cambio de ajuste
  const redetectarDebounced = useCallback(() => {
    if (!lastFile) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      detectar(lastFile)
    }, 800)
  }, [lastFile, detectar])

  // Limpiar timeout al desmontar
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  function handleSetting(key, value) {
    setSetting(key, value)
    redetectarDebounced()
  }

  function handleReset() {
    resetSettings()
    // Tras reset también re-detectamos
    if (lastFile) {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => detectar(lastFile), 800)
    }
  }

  const canRedetect = !!lastFile && !cargando

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
        {/* Indicador de carga dentro del botón */}
        {cargando && (
          <svg className="w-3 h-3 animate-spin ml-1 text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        )}
      </button>

      {settingsOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-surface rounded-xl shadow-2xl border border-border-strong overflow-hidden
          max-md:left-auto max-md:right-0 max-md:w-[min(92vw,22rem)]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-surface-elevated">
            <span className="text-[13px] font-semibold text-primary">Ajustes de detección</span>
            <button
              onClick={handleReset}
              className="text-[11px] text-muted hover:text-accent transition-colors"
            >
              Restaurar
            </button>
          </div>

          {/* Aviso de auto re-detección */}
          {lastFile && (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent/5 border-b border-border-light">
              <RefreshCw size={11} className="text-accent shrink-0" />
              <span className="text-[11px] text-accent">
                Los cambios re-detectan la imagen automáticamente
              </span>
            </div>
          )}

          <div className="p-4 flex flex-col gap-4">

            {/* Eliminar fondo */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-primary">Eliminar fondo</p>
                <p className="text-[11px] text-muted">IMPORTANTE: si estás usando una imagen sin fondo desactiva esta opción</p>
              </div>
              <button
                onClick={() => handleSetting('remove_bg', !s.remove_bg)}
                className={`relative h-5 w-9 rounded-full transition-colors shrink-0
                  ${s.remove_bg ? 'bg-accent' : 'bg-surface-elevated border border-border-strong'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all
                  ${s.remove_bg ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="border-t border-border-light" />

            <Slider
              label="Suavizado gaussiano"
              hint="Suaviza bordes antes de vectorizar"
              min={0.5} max={3.0} step={0.5}
              value={s.gauss_sigma}
              onChange={(v) => handleSetting('gauss_sigma', v)}
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
                  onChange={(e) => handleSetting('n_colores', Number(e.target.value))}
                  className={RANGE_CLASS}
                  style={rangeFillStyle(0, 14, s.n_colores)}
                />
                <span className="text-[11px] text-muted w-5 text-right">14</span>
              </div>
            </div>

            <Slider
              label="Fusión de colores (ΔE)"
              hint="Agrupa capas con colores similares"
              min={5} max={30} step={1}
              value={s.delta_e}
              onChange={(v) => handleSetting('delta_e', v)}
              left="5" right="30"
            />

            <Slider
              label="Área mínima"
              hint="Ignora manchas pequeñas (px²)"
              min={100} max={2000} step={100}
              value={s.min_area}
              onChange={(v) => handleSetting('min_area', v)}
              left="100" right="2k"
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border-light bg-surface-elevated flex justify-between items-center gap-2">
            {canRedetect ? (
              <button
                onClick={() => detectar(lastFile)}
                disabled={cargando}
                className="flex items-center gap-1.5 text-[12px] text-accent hover:underline font-medium disabled:opacity-50"
              >
                <RefreshCw size={12} />
                Reaplicar ahora
              </button>
            ) : (
              <span className="text-[11px] text-muted">
                {lastFile ? 'Detectando...' : 'Sube una imagen primero'}
              </span>
            )}
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-[12px] text-muted hover:text-primary transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
